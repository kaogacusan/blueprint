/* /pay: someone who paid by GCash types their reference number (api/pay.js checks it). */
(() => {
  const form = document.getElementById("payForm");
  const err = document.getElementById("payError");
  const q = new URLSearchParams(location.search);
  if (q.get("email")) form.email.value = q.get("email");
  if (q.get("code")) form.code.value = q.get("code");
  (form.email.value && form.code.value ? form.ref : form.email).focus();

  const MSG = {
    nomatch: "That email and code don’t match a sign-up. Check the email we sent you, or register again with the same email to get it resent.",
    ref: "That doesn’t look like a GCash reference number. Type only the numbers after “Ref No.” on your receipt.",
    cancelled: "This sign-up was cancelled. Email admublueprint@gmail.com and we’ll sort it out.",
  };

  form.addEventListener("input", (e) => {
    const f = e.target.closest(".field");
    if (f?.classList.contains("is-invalid") && e.target.checkValidity()) f.classList.remove("is-invalid");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll(".field").forEach((f) => {
      const i = f.querySelector("input");
      const valid = i.checkValidity() && i.value.trim() !== "";
      f.classList.toggle("is-invalid", !valid);
      if (!valid) ok = false;
    });
    if (!ok) return form.querySelector(".is-invalid input").focus();

    const btn = form.querySelector("[type=submit]");
    btn.classList.add("is-loading");
    btn.disabled = true;
    err.hidden = true;
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.value, code: form.code.value, ref: form.ref.value }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(MSG[out.error] || "Something went wrong. Please check your connection and try again.");
      if (out.status === "paid") {
        document.getElementById("doneTitle").textContent = `You’re already in, ${out.name}.`;
        document.getElementById("doneText").textContent = "Your seat is confirmed. Check your email for the schedule and pre-work.";
      } else if (out.name) {
        document.getElementById("doneTitle").textContent = `Got it, ${out.name}.`;
      }
      form.hidden = true;
      document.getElementById("payDone").hidden = false;
    } catch (x) {
      err.textContent = x.message;
      err.hidden = false;
    } finally {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
  });
})();
