/* Budget: the costing sheet's math, live. Only the owner changes the inputs. */
import { S, costing, setting, saveSetting } from "/admin/store.js";
import { esc, icon, peso, countUps, openDrawer, closeDrawer, formFields, readForm, toast, confirmBox } from "/admin/lib.js";
import { ownerOnly } from "/admin/ui.js";

const num = (v) => (v === "" || v == null ? null : Number(v));
const input = (path, v, opts = {}) =>
  S.owner ? `<input class="cell-in" data-path="${path}" type="${opts.type || "number"}" step="${opts.step || "any"}" value="${v ?? ""}" placeholder="${opts.ph ?? "—"}" />` : `<span>${v == null || v === "" ? `<span class="muted">${opts.ph ?? "—"}</span>` : opts.money ? peso(v, 2) : esc(v)}</span>`;

export default {
  id: "budget", title: "Budget", icon: "wallet",
  render(root) {
    const B = costing();
    const c = B.c;
    const papers = c.papers || [];
    const maxSession = Math.max(1, ...B.sessions.map((s) => s.totalMax));

    root.innerHTML = `
      <header class="ph">
        <h1 class="ph__title">Budget</h1>
      </header>

      ${!B.pricesIn ? `<div class="callout callout--warn">${icon("alert")}<b>Waiting for printer prices</b><span>Print costs read ₱0 until ${esc((c.printers || []).join(", "))} quote per page.</span></div>` : ""}

      <section class="readouts readouts--6">
        ${[
          ["Ticket", c.ticket, "peso", "all four sessions"],
          ["Revenue @ " + c.baseline, B.revenueBase, "peso", `@ ${c.max}: ${peso(B.revenueMax)}`],
          ["Total cost @ " + c.baseline, B.totalBase, "peso", `@ ${c.max}: ${peso(B.totalMax)}`],
          ["Left over @ " + c.baseline, B.revenueBase - B.totalBase, "peso", `@ ${c.max}: ${peso(B.revenueMax - B.totalMax)}`],
          ["Cost per participant", B.perBase, "peso", `${c.ticket ? Math.round((B.perBase / c.ticket) * 100) : 0}% of the ticket`],
          ["Break-even seats", B.breakEvenBase, "", "approx."],
        ].map(([k, v, fmt, sub], i) => `<article class="ro ro--static in" style="--i:${i}"><span class="lbl">${esc(k)}</span><span class="ro__n"><b data-count="${Math.round(v || 0)}" data-fmt="${fmt}">0</b></span><span class="ro__sub">${esc(sub)}</span></article>`).join("")}
      </section>

      <section class="cols cols--budget">
        <article class="panel">
          <header class="pnl"><h3>Settings</h3></header>
          <dl class="settings">
            <div><dt>Ticket price (₱)</dt><dd>${input("ticket", c.ticket)}</dd></div>
            <div><dt>Baseline participants</dt><dd>${input("baseline", c.baseline)}</dd></div>
            <div><dt>Max participants</dt><dd>${input("max", c.max)}</dd></div>
            <div><dt>Spare copies per session</dt><dd>${input("spares", c.spares)}</dd></div>
            <div><dt>Printer to use</dt><dd>${S.owner ? `<select class="cell-in" data-path="printer">${(c.printers || []).map((p) => `<option ${p === c.printer ? "selected" : ""}>${esc(p)}</option>`).join("")}</select>` : esc(c.printer)}</dd></div>
          </dl>
        </article>

        <article class="panel">
          <header class="pnl"><h3>Cost per session</h3><span class="pnl__note">@${c.baseline} / @${c.max}</span></header>
          <div class="sbars">${B.sessions.map((s) => `
            <div class="sbar">
              <b>${s.s}</b>
              <div class="sbar__track">
                <i class="sbar__print" style="--w:${(s.printMax / maxSession) * 100}%" title="Print"></i>
                <i class="sbar__extra" style="--w:${((s.totalMax - s.printMax) / maxSession) * 100}%" title="Venue, supplies, other"></i>
              </div>
              <span>${peso(s.totalBase)} <small>/ ${peso(s.totalMax)}</small></span>
            </div>`).join("")}</div>
          <p class="legend"><i class="sbar__print"></i>Print <i class="sbar__extra"></i>Venue, supplies, other</p>
        </article>
      </section>

      <section class="panel">
        <header class="pnl"><h3>Printer prices</h3><span class="pnl__note">₱ per page, one side</span></header>
        <div class="tablewrap"><table class="table table--prices">
          <thead><tr><th>Paper</th>${(c.printers || []).map((p) => `<th class="${p === c.printer ? "is-used" : ""}">${esc(p)}${p === c.printer ? " <span class='used'>in use</span>" : ""}</th>`).join("")}<th>Price used</th></tr></thead>
          <tbody>
            ${papers.map((paper) => `<tr><td><b>${esc(paper)}</b><small>${esc(c.questions?.[paper] || "")}</small></td>${(c.printers || []).map((p) => `<td class="${p === c.printer ? "is-used" : ""}">${input(`prices.${paper}.${p}`, c.prices?.[paper]?.[p], { money: true })}</td>`).join("")}<td><b>${peso(Number(c.prices?.[paper]?.[c.printer]) || 0, 2)}</b></td></tr>`).join("")}
            <tr class="check"><td><b>Check: earlier S1 quote</b><small>${esc(c.oldQuoteNote || "")}</small></td>${(c.printers || []).map((p) => `<td>${input(`oldQuote.${p}`, c.oldQuote?.[p], { money: true })}</td>`).join("")}<td></td></tr>
            <tr class="check"><td><b>Same order, per-page model</b><small>48 A3 pages + 208 A5 card pages + 104 cuts</small></td>${B.check.map((k) => `<td>${k.model == null ? `<span class="muted">—</span>` : peso(k.model)}</td>`).join("")}<td></td></tr>
            <tr class="check"><td><b>Difference</b><small>A big gap means a misheard price.</small></td>${B.check.map((k) => `<td>${k.diff == null ? `<span class="muted">—</span>` : `<b class="${Math.abs(k.diff) > (k.quote || 0) * 0.15 ? "bad" : "good"}">${k.diff > 0 ? "+" : ""}${peso(k.diff)}</b>`}</td>`).join("")}<td></td></tr>
          </tbody>
        </table></div>
      </section>

      <section class="panel">
        <header class="pnl"><h3>Print list</h3>${ownerOnly(`<button class="btn btn--ghost btn--sm" id="addItem">${icon("plus")} Item</button>`)}</header>
        <div class="tablewrap"><table class="table">
          <thead><tr><th></th><th>Item</th><th>Paper</th><th class="r">Sides</th><th class="r">Per person</th><th class="r">Fixed</th><th class="r">Copies @${c.baseline}</th><th class="r">Copies @${c.max}</th><th class="r">₱/page</th><th class="r">Cost @${c.baseline}</th><th class="r">Cost @${c.max}</th></tr></thead>
          <tbody>${B.items.map((it, i) => `<tr class="${S.owner ? "is-click" : ""}" data-item="${i}">
            <td><span class="tag tag--${it.session.toLowerCase()}">${it.session}</span></td>
            <td><b>${esc(it.item)}</b>${it.isCard ? ` <span class="tag">card</span>` : ""}${it.note ? `<small>${esc(it.note)}</small>` : ""}</td>
            <td>${esc(it.paper)}</td><td class="r">${it.sides}</td><td class="r">${it.perPerson}</td><td class="r">${it.fixed}</td>
            <td class="r">${it.copiesBase}</td><td class="r">${it.copiesMax}</td><td class="r">${peso(it.price, 2)}</td>
            <td class="r"><b>${peso(it.costBase)}</b></td><td class="r">${peso(it.costMax)}</td></tr>`).join("")}</tbody>
        </table></div>
      </section>

      <section class="panel">
        <header class="pnl"><h3>Session costs</h3></header>
        <div class="tablewrap"><table class="table">
          <thead><tr><th>Session</th><th class="r">Print @${c.baseline}</th><th class="r">Print @${c.max}</th><th class="r">Venue</th><th class="r">Supplies</th><th class="r">Other</th><th class="r">Total @${c.baseline}</th><th class="r">Total @${c.max}</th><th class="r">Per person @${c.baseline}</th><th>What goes in supplies / other</th></tr></thead>
          <tbody>${B.sessions.map((s) => `<tr>
            <td><span class="tag tag--${s.s.toLowerCase()}">${s.s}</span></td>
            <td class="r">${peso(s.printBase)}</td><td class="r">${peso(s.printMax)}</td>
            <td class="r">${input(`extras.${s.s}.venue`, s.venue, { money: true })}</td>
            <td class="r">${input(`extras.${s.s}.supplies`, s.supplies, { money: true })}</td>
            <td class="r">${input(`extras.${s.s}.other`, s.other, { money: true })}</td>
            <td class="r"><b>${peso(s.totalBase)}</b></td><td class="r">${peso(s.totalMax)}</td>
            <td class="r">${peso(c.baseline ? s.totalBase / c.baseline : 0)}</td>
            <td class="muted">${esc(s.what || "")}</td></tr>`).join("")}
            <tr class="total"><td>Total</td><td class="r">${peso(B.sessions.reduce((a, s) => a + s.printBase, 0))}</td><td class="r">${peso(B.sessions.reduce((a, s) => a + s.printMax, 0))}</td><td class="r" colspan="3"></td><td class="r"><b>${peso(B.totalBase)}</b></td><td class="r"><b>${peso(B.totalMax)}</b></td><td class="r">${peso(B.perBase)}</td><td></td></tr>
          </tbody>
        </table></div>
      </section>

      <details class="panel notes">
        <summary class="pnl"><h3>Notes from the costing sheet</h3>${icon("down", "notes__chev")}</summary>
        <ul class="bullets">${(c.notes || []).map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      </details>`;

    countUps(root);

    // owner: inline edits save on change
    root.querySelectorAll(".cell-in").forEach((el) => el.addEventListener("change", async () => {
      const next = structuredClone(setting("costing"));
      const path = el.dataset.path.split(".");
      let o = next;
      for (const k of path.slice(0, -1)) o = o[k] ||= {};
      o[path.at(-1)] = el.tagName === "SELECT" ? el.value : num(el.value);
      try { await saveSetting("costing", next); toast("Saved. Totals updated."); } catch { toast("Couldn’t save.", "bad"); }
    }));
    root.querySelectorAll("[data-item]").forEach((tr) => S.owner && tr.addEventListener("click", () => editItem(Number(tr.dataset.item))));
    root.querySelector("#addItem")?.addEventListener("click", () => editItem(-1));
  },
};

function editItem(i) {
  const c = setting("costing");
  const it = c.items[i] || { session: "S1", item: "", paper: (c.papers || [])[0], sides: 2, perPerson: 1, fixed: 0, isCard: false, note: "" };
  const fields = [
    { key: "item", label: "Item", full: true, autofocus: true },
    { key: "session", label: "Session", type: "select", options: ["S1", "S2", "S3", "S4"] },
    { key: "paper", label: "Paper type", type: "select", options: (c.papers || []).filter((p) => !/cutting/i.test(p)) },
    { key: "sides", label: "Sides", type: "number" },
    { key: "perPerson", label: "Copies per participant", type: "number", step: "0.5" },
    { key: "fixed", label: "Fixed copies", type: "number", help: "Extra copies that don’t depend on headcount" },
    { key: "isCard", label: "Card", type: "toggle", text: "Cut as a card (adds the cutting fee)" },
    { key: "note", label: "Note", full: true },
  ];
  openDrawer({
    eyebrow: i < 0 ? "Add" : "Edit", title: "Print item",
    body: formFields(fields, it),
    actions: `${i >= 0 ? `<button class="btn btn--ghost btn--danger-text" data-del>${icon("trash")} Delete</button>` : ""}<span class="grow"></span><button class="btn btn--primary" data-save>${icon("check")} Save</button>`,
    onMount(root) {
      root.querySelector("[data-save]").addEventListener("click", async () => {
        const v = readForm(fields, root);
        const next = structuredClone(c);
        i < 0 ? next.items.push(v) : (next.items[i] = { ...it, ...v });
        try { await saveSetting("costing", next); closeDrawer(); toast("Saved"); } catch { toast("Couldn’t save.", "bad"); }
      });
      root.querySelector("[data-del]")?.addEventListener("click", async () => {
        if (!(await confirmBox(`Remove “${it.item}” from the print list?`))) return;
        const next = structuredClone(c);
        next.items.splice(i, 1);
        await saveSetting("costing", next); closeDrawer(); toast("Removed");
      });
    },
  });
}
