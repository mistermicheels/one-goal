/** @typedef { import("../../types/DialogInput").DialogInput } DialogInput */
/** @typedef { import("../../types/DialogInput").DialogField } DialogField */
/** @typedef { import("../../types/DialogInput").TextDialogField } TextDialogField */
/** @typedef { import("../../types/DialogInput").BooleanDialogField } BooleanDialogField */

const form = document.getElementsByTagName("form")[0];
const submitButton = document.getElementsByTagName("button")[0];
const cancelButton = document.getElementsByTagName("button")[1];

/** @type {DialogInput} */
let receivedDialogInput;

window.addEventListener("load", () => {
    window.api.receive("fromMain", handleDialogInput);

    submitButton.addEventListener("click", handleFormSubmit);
    cancelButton.addEventListener("click", sendNoResult);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            handleFormSubmit();
        } else if (event.key === "Escape") {
            sendNoResult();
        }
    });
});

/** @param {DialogInput} input */
function handleDialogInput(input) {
    receivedDialogInput = input;

    if (input.message) {
        addMessage(input.message);
    }

    if (input.fields && input.fields.length > 0) {
        for (const field of input.fields) {
            if (field.type === "text") {
                addTextFieldToForm(field);
            } else if (field.type === "boolean") {
                addBooleanFieldToForm(field);
            }
        }

        const firstFormElement = document.getElementById(input.fields[0].name);

        if (firstFormElement instanceof HTMLInputElement && firstFormElement.type !== "checkbox") {
            firstFormElement.focus();
            firstFormElement.select();
        }
    }

    if (input.submitButtonName) {
        submitButton.textContent = input.submitButtonName;
    }

    const height = document.documentElement.scrollHeight;
    window.api.send("dialogHeight", { height });
}

/** @param {string} message */
function addMessage(message) {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    form.insertBefore(paragraph, submitButton);
}

/** @param {TextDialogField} field */
function addTextFieldToForm(field) {
    const formGroup = document.createElement("div");
    formGroup.classList.add("form-group");

    formGroup.appendChild(getLabelForField(field));

    const input = document.createElement("input");
    input.type = field.inputType || "text";
    input.id = field.name;
    input.name = field.name;

    input.placeholder = field.placeholder;
    input.required = field.required;

    if (field.required) {
        input.placeholder = `${field.placeholder} (required)`;
    }

    if (field.pattern) {
        input.pattern = field.pattern;
    }

    input.classList.add("form-control");

    if (field.currentValue) {
        input.setAttribute("value", field.currentValue);
    }

    formGroup.appendChild(input);

    if (field.info) {
        formGroup.appendChild(getInfoForMessage(field.info));
    }

    form.insertBefore(formGroup, submitButton);
}

/** @param {BooleanDialogField} field */
function addBooleanFieldToForm(field) {
    const formGroup = document.createElement("div");
    formGroup.classList.add("form-group");

    const customSwitch = document.createElement("div");
    customSwitch.classList.add("custom-control", "custom-switch");
    formGroup.appendChild(customSwitch);

    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = field.name;
    input.name = field.name;
    input.classList.add("custom-control-input");
    input.checked = field.currentValue;
    customSwitch.appendChild(input);

    const label = getLabelForField(field);
    label.classList.add("custom-control-label");
    customSwitch.appendChild(label);

    if (field.info) {
        formGroup.appendChild(getInfoForMessage(field.info));
    }

    form.insertBefore(formGroup, submitButton);
}

/** @param {DialogField} field */
function getLabelForField(field) {
    const label = document.createElement("label");
    label.setAttribute("for", field.name);
    label.textContent = field.label;
    return label;
}

/** @param {string} message */
function getInfoForMessage(message) {
    const info = document.createElement("small");
    info.classList.add("form-text", "text-muted");
    info.textContent = message;
    return info;
}

function handleFormSubmit() {
    form.classList.add("was-validated");

    if (!form.checkValidity()) {
        return;
    }

    if (!receivedDialogInput.fields) {
        window.api.send("dialogResult", { result: {} });
        return;
    }

    const result = {};

    for (const field of receivedDialogInput.fields) {
        const element = document.getElementById(field.name);

        if (!(element instanceof HTMLInputElement)) {
            // should never happen unless we have a bug in the form generation logic
            throw new Error(`Found no input element for field ${field.name}`);
        }

        if (field.type === "text") {
            result[field.name] = element.value || undefined;
        } else if (field.type === "boolean") {
            result[field.name] = element.checked;
        }
    }

    window.api.send("dialogResult", { result });
}

function sendNoResult() {
    window.api.send("dialogResult", { result: undefined });
}