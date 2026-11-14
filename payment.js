const paymentForm = document.querySelector("#payment-form");
const paymentMethod = document.querySelector("#payment-method");
const methodNote = document.querySelector("#payment-method-note");
const paymentResult = document.querySelector("#payment-result");

const currencyFormatter = new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR"
});

const methodInstructions = {
    bank: "Buat pindahan ke akaun rasmi kelab yang diberikan oleh bendahari. Selepas bayaran, hubungi bendahari untuk pengesahan.",
    cash: "Serahkan wang tunai terus kepada bendahari dan tunjukkan nombor rujukan yang dijana selepas menghantar borang."
};

paymentMethod.addEventListener("change", function () {
    methodNote.textContent = methodInstructions[paymentMethod.value]
        || "Pilih kaedah untuk melihat arahan bayaran.";
});

paymentForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!paymentForm.reportValidity()) {
        return;
    }

    const formData = new FormData(paymentForm);
    const name = formData.get("payerName").trim();
    const amount = Number(formData.get("amount"));
    const purpose = formData.get("purpose");
    const method = formData.get("method");

    if (!name || !Number.isFinite(amount) || amount <= 0 || !methodInstructions[method]) {
        paymentForm.reportValidity();
        return;
    }

    const reference = `KTD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    document.querySelector("#result-reference").textContent = reference;
    document.querySelector("#result-name").textContent = name;
    document.querySelector("#result-purpose").textContent = purpose;
    document.querySelector("#result-amount").textContent = currencyFormatter.format(amount);
    document.querySelector("#result-method").textContent = paymentMethod.selectedOptions[0].textContent;
    paymentResult.hidden = false;
    paymentResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
});
