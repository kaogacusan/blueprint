/* Questions: what people asked with the "Ask us" form on the site (api/ask.js).
   Anyone on the core team answers here. The answer is emailed from the Blueprint inbox, signed
   "The Blueprint team" (api/questions.js), so nobody answers from their own email or DMs.
   Guests never see this page. The owner erases questions after the program, like sign-ups. */
import { S, update, answerQuestion } from "/admin/store.js";
import { supa } from "/admin/supa.js";
import { esc, icon, toast, confirmBox } from "/admin/lib.js";
import { empty } from "/admin/ui.js";

const TABS = [["open", "To answer"], ["answered", "Answered"], ["closed", "Closed"]];
let tab = "open";
const drafts = {}; // answers being written survive live refreshes
const fmt = (iso) => new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const first = (name = "") => name.trim().split(/\s+/)[0] || "there";
const STATUS = { registered: "Not paid yet", paid: "Paid", waitlist: "Waitlist", cancelled: "Cancelled" };

export default {
  id: "questions", title: "Questions", icon: "message",
  badge: () => (S.data.questions || []).filter((q) => q.status === "open").length || "",
  render(root) {
    const all = S.data.questions || [];
    const list = all.filter((q) => q.status === tab);
    const regs = S.data.registrations || [];
    const signup = (email) => regs.find((r) => r.email.toLowerCase() === email.toLowerCase());

    root.innerHTML = `
      <header class="ph">
        <div>
          <h1 class="ph__title">Questions</h1>
          <p class="ph__sub">From the <b>Ask us</b> form on the site. Write an answer and click Send: it’s emailed from admublueprint@gmail.com, signed “The Blueprint team”. The whole core team sees these, so whoever’s free can answer. Please answer within 2 days.</p>
        </div>
        ${S.owner && all.length ? `<div class="ph__actions"><button class="btn btn--ghost" id="eraseQ" title="After the program: the privacy notice promises we delete these">${icon("trash")} Erase all ${all.length}</button></div>` : ""}
      </header>

      <div class="card filters">
        <div class="seg seg--tabs">${TABS.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? "is-on" : ""}">${l}<span>${all.filter((q) => q.status === k).length}</span></button>`).join("")}</div>
      </div>

      ${list.length ? list.map((q, i) => card(q, signup(q.email), i)).join("")
        : `<div class="card">${empty(tab === "open" ? "No questions waiting. New ones show up here (and in the Blueprint inbox as a heads-up)." : "Nothing here yet.", "message")}</div>`}`;

    const rerender = () => this.render(root);
    root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; rerender(); }));
    root.querySelector("#eraseQ")?.addEventListener("click", async () => {
      if (!(await confirmBox(`Erase all ${all.length} questions and answers for good? Only do this after the program is over. This can’t be undone.`))) return;
      const { error } = await supa.from("questions").delete().gt("id", 0);
      if (error) return toast("Couldn’t erase.", "bad");
      S.data.questions = [];
      toast("Erased");
      rerender();
    });
    root.addEventListener("input", (e) => { const c = e.target.closest("[data-id]"); if (c && e.target.matches("textarea")) drafts[c.dataset.id] = e.target.value; });
    root.querySelectorAll("[data-id]").forEach((c) => c.addEventListener("click", async (e) => {
      const id = Number(c.dataset.id), q = all.find((x) => x.id === id);
      const b = e.target.closest("button");
      if (!b || !q) return;
      if (b.matches("[data-send]")) {
        const text = c.querySelector("textarea").value.trim();
        if (text.length < 2) return toast("Write an answer first.", "bad");
        if (!(await confirmBox(`Email this answer to ${q.name} (${q.email})?`, { ok: "Send", tone: "" }))) return;
        b.disabled = true;
        try { await answerQuestion(id, text); delete drafts[id]; toast(`Answer sent to ${q.name}`); }
        catch (err) { b.disabled = false; toast(err.message === "email" ? "The email didn’t send. Try again in a minute." : "Couldn’t send. Try again.", "bad"); }
        return;
      }
      if (b.matches("[data-st]")) {
        try { await update("questions", id, { status: b.dataset.st }); toast(b.dataset.st === "closed" ? "Closed. Nothing was emailed." : "Moved back to To answer"); }
        catch { toast("Couldn’t save.", "bad"); }
      }
      if (b.matches("[data-del]")) {
        if (!(await confirmBox(`Delete ${q.name}’s question? This can’t be undone.`))) return;
        const { error } = await supa.from("questions").delete().eq("id", id);
        if (error) return toast("Couldn’t delete.", "bad");
        S.data.questions = S.data.questions.filter((x) => x.id !== id);
        rerender();
      }
    }));
  },
};

function card(q, reg, i) {
  return `<article class="card qcard in" data-id="${q.id}" style="--i:${Math.min(i, 16)}">
    <header class="qcard__head">
      <div><b>${esc(q.name)}</b> <a href="mailto:${esc(q.email)}" class="muted">${esc(q.email)}</a>
        ${reg ? `<span class="tag" title="Same email as a sign-up">Signed up · ${esc(reg.code || "")} · ${esc(STATUS[reg.status] || reg.status)}</span>` : ""}</div>
      <span class="muted nowrap">${esc(fmt(q.created_at))}</span>
    </header>
    <p class="qcard__msg">${esc(q.message)}</p>
    ${q.status === "open" ? `
      <textarea class="qcard__answer" rows="4" maxlength="4000" placeholder="Write your answer. The email starts with “Hi ${esc(first(q.name))}! Thanks for asking.” and ends with “The Blueprint team”.">${esc(drafts[q.id] || "")}</textarea>
      <div class="qcard__actions">
        <button class="btn btn--ghost btn--sm" data-st="closed" title="Spam, or already handled another way. Nothing is emailed.">Close without answering</button>
        <button class="btn btn--primary btn--sm" data-send>${icon("send")} Send answer</button>
      </div>`
    : q.status === "answered" ? `
      <div class="qcard__reply"><small>${icon("check")} Answered${q.answered_by ? ` by ${esc(q.answered_by)}` : ""}${q.answered_at ? ` · ${esc(fmt(q.answered_at))}` : ""}</small><p>${esc(q.answer)}</p></div>`
    : `<div class="qcard__actions"><button class="btn btn--ghost btn--sm" data-st="open">Move back to To answer</button></div>`}
    ${S.owner ? `<button class="iconbtn qcard__del" data-del title="Delete">${icon("trash")}</button>` : ""}
  </article>`;
}
