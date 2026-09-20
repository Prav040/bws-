import os, base64, logging, subprocess, requests, json, re
from pathlib import Path
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, ContextTypes, filters
from openai import OpenAI

load_dotenv(Path(__file__).parent / ".env")

WORKSPACE = Path(__file__).parent
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")

TOKEN_LEAD = os.getenv("TOKEN_LEAD")
TOKEN_DEV = os.getenv("TOKEN_DEV")
TOKEN_TESTER = os.getenv("TOKEN_TESTER")
TOKEN_REVIEWER = os.getenv("TOKEN_REVIEWER")

MODEL_LEAD = os.getenv("MODEL_LEAD", "openai/gpt-4o-mini")
MODEL_DEV = os.getenv("MODEL_DEV", "deepseek/deepseek-chat")
MODEL_TESTER = os.getenv("MODEL_TESTER", "deepseek/deepseek-chat")
MODEL_REVIEWER = os.getenv("MODEL_REVIEWER", "anthropic/claude-3.5-haiku")

FEEDBACK_FILE = WORKSPACE / "DEV_FEEDBACK.md"
HISTORY_FILE = WORKSPACE / "chat_history.json"

logging.basicConfig(level=logging.INFO)
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_KEY, timeout=180.0)

def send_agent_msg(token: str, chat_id: int, text: str):
    if not token:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}
    try:
        r = requests.post(url, json=payload, timeout=15)
        if r.status_code != 200:
            requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=15)
    except Exception as e:
        logging.error(f"Telegram Fehler: {e}")

def get_github_auth():
    token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPO")
    remote = subprocess.getoutput(f"git -C {WORKSPACE} remote get-url origin").strip()

    if not repo:
        m = re.search(r"github\.com[:/](?P<owner>[^/]+)/(?P<repo>[^/\.]+)", remote)
        if m:
            repo = f"{m.group('owner')}/{m.group('repo')}"
    if not token:
        m_tok = re.search(r"https://([^@:]+)(?::[^@]+)?@github\.com", remote)
        if m_tok:
            token = m_tok.group(1)
    return token, repo

# --- TOOL FUNCTIONS ---

def tool_list_files(subpath: str = ".") -> str:
    target = (WORKSPACE / subpath).resolve()
    if not str(target).startswith(str(WORKSPACE)):
        return "Zugriff verweigert."
    if not target.exists():
        return f"Pfad nicht gefunden: {subpath}"
    items = [f"{'[DIR] ' if p.is_dir() else '[FILE]'} {p.name}" for p in target.iterdir() if not p.name.startswith(".")]
    return "\n".join(items[:50]) or "Verzeichnis ist leer."

def tool_read_file(file_path: str) -> str:
    target = (WORKSPACE / file_path).resolve()
    if not str(target).startswith(str(WORKSPACE)):
        return "Zugriff verweigert."
    if not target.is_file():
        return f"Datei nicht gefunden: {file_path}"
    try:
        content = target.read_text(encoding="utf-8")
        return content[:4000] + ("\n...[gekürzt]" if len(content) > 4000 else "")
    except Exception as e:
        return f"Fehler beim Lesen: {str(e)}"

def tool_write_file(file_path: str, content: str) -> str:
    target = (WORKSPACE / file_path).resolve()
    if not str(target).startswith(str(WORKSPACE)):
        return "Zugriff verweigert."
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return f"Datei {file_path} gespeichert."
    except Exception as e:
        return f"Fehler beim Schreiben von {file_path}: {str(e)}"

def tool_run_build() -> str:
    res = subprocess.run(f"npm --prefix {WORKSPACE} run build", shell=True, capture_output=True, text=True)
    if res.returncode == 0:
        return "BUILD_SUCCESS"
    return f"BUILD_FAILED:\n{res.stderr[-2000:] or res.stdout[-2000:]}"

def tool_git_push(commit_msg: str) -> str:
    cmd = f"cd {WORKSPACE} && git add -A && git commit -m '{commit_msg}' && git push origin HEAD"
    out = subprocess.getoutput(cmd)
    return out[-1500:]

def tool_create_issue(title: str, body: str) -> str:
    token, repo = get_github_auth()
    if not token or not repo:
        return "GitHub Daten fehlen."
    url = f"https://api.github.com/repos/{repo}/issues"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    resp = requests.post(url, headers=headers, json={"title": title, "body": body})
    if resp.status_code == 201:
        d = resp.json()
        return f"Issue #{d['number']} erstellt: {d['html_url']}"
    return f"Fehler ({resp.status_code}): {resp.text}"

# --- KI AGENTEN PIPELINE (TESTER & REVIEWER) ---

def run_qa_tester_agent(build_output: str, task: str, chat_id: int) -> bool:
    """QA Tester analysiert Build-Status und Code-Qualität."""
    send_agent_msg(TOKEN_TESTER, chat_id, "🧪 *QA Tester:* Starte Build- und Logik-Validierung...")
    
    rules = FEEDBACK_FILE.read_text(encoding="utf-8") if FEEDBACK_FILE.exists() else ""
    prompt = (
        f"Du bist der strenge QA Tester für ein Vite/React/TypeScript-Projekt.\n"
        f"Aufgabe des Devs war: {task}\n"
        f"Build-Ergebnis:\n{build_output}\n\n"
        f"Projekt-Regeln:\n{rules}\n\n"
        "Antworte kurz und präzise auf Deutsch:\n"
        "1. Gibt es Build- oder TypeScript-Fehler?\n"
        "2. Falls ja, nenne exakt die Datei und Zeile.\n"
        "3. Falls der Build erfolgreich ist, schreibe am Ende: STATUS: PASSED. Falls Fehler da sind: STATUS: FAILED."
    )
    
    res = client.chat.completions.create(
        model=MODEL_TESTER,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )
    review = res.choices[0].message.content
    send_agent_msg(TOKEN_TESTER, chat_id, f"🧪 *QA Tester:*\n{review}")
    return "STATUS: PASSED" in review

def run_code_reviewer_agent(task: str, chat_id: int) -> bool:
    """Code Reviewer analysiert den Git Diff vor dem Push."""
    diff = subprocess.getoutput(f"git -C {WORKSPACE} diff")[:3500]
    if not diff:
        diff = "Keine uncommitteten Änderungen gefunden (bereits gestaged oder leer)."

    send_agent_msg(TOKEN_REVIEWER, chat_id, "🧐 *Code Reviewer:* Prüfe Git-Diff auf Code-Qualität, Clean Code und Design-Richtlinien...")

    rules = FEEDBACK_FILE.read_text(encoding="utf-8") if FEEDBACK_FILE.exists() else ""
    prompt = (
        f"Du bist der Senior Code Reviewer (Claude).\n"
        f"Ursprüngliche Anforderung: {task}\n"
        f"Regeln / Feedback:\n{rules}\n\n"
        f"Aktueller Git-Diff:\n{diff}\n\n"
        "Bewerte die Änderungen kritisch:\n"
        "- TypeScript Typing (kein unnötiges 'any')\n"
        "- Tailwind CSS & Responsiveness\n"
        "- Code-Sauberkeit & Best Practices\n"
        "Gib konstruktives Feedback. Wenn die Qualität stimmt und der Code bereit für Git Push ist, schließe ab mit: 'FAZIT: LGTM'. "
        "Wenn schwerwiegende Mängel vorliegen, schreibe: 'FAZIT: REJECT'."
    )

    res = client.chat.completions.create(
        model=MODEL_REVIEWER,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    review = res.choices[0].message.content
    send_agent_msg(TOKEN_REVIEWER, chat_id, f"🧐 *Code Reviewer:*\n{review}")
    return "LGTM" in review

# --- DEV AGENT LOOP ---

DEV_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Liest den Inhalt einer Datei im Workspace.",
            "parameters": {"type": "object", "properties": {"file_path": {"type": "string"}}, "required": ["file_path"]}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Erstellt oder überschreibt Code-Dateien (z.B. src/components/...).",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string"},
                    "content": {"type": "string"}
                },
                "required": ["file_path", "content"]
            }
        }
    }
]

def run_dev_pipeline(task: str, chat_id: int):
    send_agent_msg(TOKEN_DEV, chat_id, f"💻 *Senior Dev:* Auftrag erhalten. Starte Code-Implementierung...")
    
    rules = FEEDBACK_FILE.read_text(encoding="utf-8") if FEEDBACK_FILE.exists() else ""
    dev_prompt = (
        "Du bist der Senior Developer (Vite, React, TypeScript, Tailwind). "
        "Erstelle oder modifiziere die benötigten Dateien im Workspace mit `write_file`. "
        "Lies bei Bedarf bestehende Dateien mit `read_file`.\n"
        f"Regeln:\n{rules}"
    )

    messages = [
        {"role": "system", "content": dev_prompt},
        {"role": "user", "content": f"Setze folgende Anforderung um:\n{task}"}
    ]

    # Bis zu 5 Werkzeug-Schritte für Dateiänderungen
    for _ in range(5):
        resp = client.chat.completions.create(
            model=MODEL_DEV,
            messages=messages,
            tools=DEV_TOOLS,
            tool_choice="auto"
        )
        msg = resp.choices[0].message
        messages.append(msg)

        if not msg.tool_calls:
            break

        for tc in msg.tool_calls:
            fn = tc.function.name
            args = json.loads(tc.function.arguments or "{}")
            if fn == "read_file":
                out = tool_read_file(args.get("file_path", ""))
            elif fn == "write_file":
                fp = args.get("file_path", "")
                send_agent_msg(TOKEN_DEV, chat_id, f"📝 *Senior Dev:* Schreibe `{fp}`...")
                out = tool_write_file(fp, args.get("content", ""))
            
            messages.append({"role": "tool", "tool_call_id": tc.id, "content": out})

    # Phase 2: QA Tester prüft den Build
    build_res = tool_run_build()
    tester_passed = run_qa_tester_agent(build_res, task, chat_id)

    if not tester_passed:
        send_agent_msg(TOKEN_DEV, chat_id, "💻 *Senior Dev:* Der QA Tester hat Fehler gemeldet. Ich halte den Push an.")
        return

    # Phase 3: Code Reviewer prüft den Git Diff
    reviewer_approved = run_code_reviewer_agent(task, chat_id)

    if reviewer_approved:
        send_agent_msg(TOKEN_DEV, chat_id, "🚀 *Senior Dev:* QA Tester und Reviewer haben approved! Pushe jetzt zu GitHub...")
        push_res = tool_git_push(f"feat: implement {task[:40]}")
        send_agent_msg(TOKEN_DEV, chat_id, f"🎉 *Senior Dev:* Push erfolgreich!\n```\n{push_res}\n```")
    else:
        send_agent_msg(TOKEN_DEV, chat_id, "💻 *Senior Dev:* Reviewer verlangt Nachbesserungen vor dem Release.")

# --- TECH LEAD ORCHESTRATION ---

LEAD_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "assign_task_to_dev",
            "description": "Startet die Implementierung beim Dev-Team inklusive QA-Testing und Code-Review.",
            "parameters": {
                "type": "object",
                "properties": {"task_description": {"type": "string"}},
                "required": ["task_description"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "Listet Dateien im Repository auf.",
            "parameters": {"type": "object", "properties": {"subpath": {"type": "string"}}, "required": []}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Liest eine Datei im Repo.",
            "parameters": {"type": "object", "properties": {"file_path": {"type": "string"}}, "required": ["file_path"]}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_github_issue",
            "description": "Erstellt ein Issue auf GitHub.",
            "parameters": {
                "type": "object",
                "properties": {"title": {"type": "string"}, "body": {"type": "string"}},
                "required": ["title", "body"]
            }
        }
    }
]

def load_history():
    if HISTORY_FILE.exists():
        try:
            return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))[-12:]
        except Exception:
            return []
    return []

def save_history(history):
    HISTORY_FILE.write_text(json.dumps(history[-16:], ensure_ascii=False, indent=2), encoding="utf-8")

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user_msg = update.message.text.strip()

    if user_msg.lower().startswith(("merk dir", "feedback:", "regel:")):
        with open(FEEDBACK_FILE, "a", encoding="utf-8") as f:
            f.write(f"\n- {user_msg}\n")
        send_agent_msg(TOKEN_LEAD, chat_id, f"🧠 *Tech Lead:* In `DEV_FEEDBACK.md` gespeichert:\n> {user_msg}")
        return

    history = load_history()
    system_prompt = (
        "Du bist der Tech Lead eines App-Entwicklerteams (Vite, TypeScript, Tailwind, Supabase). "
        "Du berätst den Product Owner im Chat und steuerst das Team bedacht und pragmatisch.\n\n"
        "REGELN FÜR ENTSCHEIDUNGEN:\n"
        "1. FRAGEN & FEHLERSUCHE (z.B. 'Warum sehe ich X nicht?', 'Was ist der Status?'):\n"
        "   - Starte KEINE Pipeline! Delegiere NICHT an den Dev!\n"
        "   - Nutze `read_file` oder `list_files`, um den aktuellen Code zu überprüfen.\n"
        "   - Antworte direkt dem Benutzer mit der Erklärung (z.B. 'In App.tsx ist Login noch drin' oder 'Im Code ist es bereits weg, bitte leere den Handy-Cache').\n\n"
        "2. KONKRETE CODE-ÄNDERUNGEN (z.B. 'Entferne jetzt Komponente X', 'Baue Feature Y', Mockups):\n"
        "   - Rufe `assign_task_to_dev` auf, damit Dev, QA und Reviewer die Änderung bauen und pushen."
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_msg})

    try:
        resp = client.chat.completions.create(
            model=MODEL_LEAD,
            messages=messages,
            tools=LEAD_TOOLS,
            tool_choice="auto"
        )
        msg = resp.choices[0].message

        if msg.tool_calls:
            messages.append(msg)
            for tc in msg.tool_calls:
                fn_name = tc.function.name
                fn_args = json.loads(tc.function.arguments or "{}")
                tool_result = ""

                if fn_name == "assign_task_to_dev":
                    task = fn_args.get("task_description", "")
                    send_agent_msg(TOKEN_LEAD, chat_id, "📐 *Tech Lead:* Aufgabe an das Team übergeben. Pipeline startet...")
                    run_dev_pipeline(task, chat_id)
                    tool_result = "Pipeline durchlaufen."
                elif fn_name == "list_files":
                    tool_result = tool_list_files(fn_args.get("subpath", "."))
                elif fn_name == "read_file":
                    tool_result = tool_read_file(fn_args.get("file_path", ""))
                elif fn_name == "create_github_issue":
                    tool_result = tool_create_issue(fn_args.get("title", ""), fn_args.get("body", ""))

                messages.append({"role": "tool", "tool_call_id": tc.id, "content": tool_result})

            final_resp = client.chat.completions.create(model=MODEL_LEAD, messages=messages)
            reply = final_resp.choices[0].message.content
        else:
            reply = msg.content

        send_agent_msg(TOKEN_LEAD, chat_id, f"📐 *Tech Lead:*\n{reply}")
        history.append({"role": "user", "content": user_msg})
        history.append({"role": "assistant", "content": reply})
        save_history(history)

    except Exception as e:
        send_agent_msg(TOKEN_LEAD, chat_id, f"⚠️ Fehler: {str(e)}")

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    photo = await update.message.photo[-1].get_file()
    path = WORKSPACE / "design" / "mockup.png"
    path.parent.mkdir(exist_ok=True)
    await photo.download_to_drive(custom_path=path)

    send_agent_msg(TOKEN_LEAD, chat_id, "📐 *Tech Lead:* Mockup empfangen. Analysiere UI...")
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    try:
        res = client.chat.completions.create(
            model=MODEL_LEAD,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analysiere das UI-Mockup. Erstelle eine Komponenten-Spezifikation für den Dev."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
                ]
            }]
        )
        spec = res.choices[0].message.content
        send_agent_msg(TOKEN_LEAD, chat_id, f"📋 *Tech Lead Roadmap:*\n\n{spec}")
        send_agent_msg(TOKEN_LEAD, chat_id, "📐 *Tech Lead:* Übergebe an Dev-Team...")
        run_dev_pipeline(f"Baue Komponenten nach Roadmap:\n{spec}", chat_id)
    except Exception as e:
        send_agent_msg(TOKEN_LEAD, chat_id, f"⚠️ Analyse-Fehler: {str(e)}")

if __name__ == "__main__":
    app = ApplicationBuilder().token(TOKEN_LEAD).build()
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    print("🚀 Vollständiges 4-Agenten-Team online.")
    app.run_polling()
