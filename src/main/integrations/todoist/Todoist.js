/** @typedef { import("../../Logger") } Logger */
/** @typedef { import("../../../types/DialogInput").DialogField } DialogField */
/** @typedef { import("../../../types/Integration").Integration<"todoist"> } TodoistIntegration */
/** @typedef { import("../../../types/InternalConfiguration").TodoistIntegrationConfiguration } TodoistIntegrationConfiguration */

const axios = require("axios").default;

const TodoistFilterGenerator = require("./TodoistFilterGenerator");
const TodoistTaskMerger = require("./TodoistTaskMerger");
const TodoistTaskTransformer = require("./TodoistTaskTransformer");

/** @implements {TodoistIntegration} */
class Todoist {
    /** @param {Logger} logger */
    constructor(logger) {
        this._token = undefined;
        this._labelName = undefined;
        this._includeFutureTasksWithLabel = undefined;
        this._mergeSubtasksWithParent = undefined;

        this._labelId = undefined;

        this._filterGenerator = new TodoistFilterGenerator();
        this._merger = new TodoistTaskMerger();
        this._transformer = new TodoistTaskTransformer();
        this._logger = logger;
    }

    /** @returns {DialogField[]} */
    getConfigurationDialogFields() {
        return [
            {
                type: "text",
                name: "token",
                label: "Todoist token",
                placeholder: "Your Todoist API token",
                required: true,
                inputType: "password",
                info:
                    "Do not share this token with anyone. If you don't have a token yet, you can get it from the Todoist web UI under Settings - Integrations - API token.",
                currentValue: this._token,
            },
            {
                type: "text",
                name: "labelName",
                label: "Label name",
                placeholder: "Current task label",
                required: true,
                info: "This is the Todoist label you will use to mark a task as current.",
                currentValue: this._labelName,
            },
            {
                type: "boolean",
                name: "includeFutureTasksWithLabel",
                label: "Include future tasks with the label",
                info:
                    "If enabled, the application will also look at tasks scheduled for a date in the future. If not enabled, those tasks will be ignored and the label will be automatically removed from them (this can be helpful for recurring tasks).",
                currentValue: !!this._includeFutureTasksWithLabel,
            },
            {
                type: "boolean",
                name: "mergeSubtasksWithParent",
                label: "Merge subtasks with parent",
                info:
                    "If enabled, a task with the label will be ignored if at least one of its subtasks also has the label. In that case, the subtasks with the label will also inherit the parent task's due date if they don't have their own due date.",
                currentValue: !!this._mergeSubtasksWithParent,
            },
        ];
    }

    /** @param {TodoistIntegrationConfiguration} configuration*/
    configure(configuration) {
        this._token = configuration.token;
        this._labelName = configuration.labelName;
        this._includeFutureTasksWithLabel = configuration.includeFutureTasksWithLabel;
        this._mergeSubtasksWithParent = configuration.mergeSubtasksWithParent;

        this._labelId = undefined;
    }

    async _ensureInitialized() {
        if (this._labelId) {
            return;
        }

        const allLabels = await this._performApiRequest("get", "/labels");
        const matchingLabel = allLabels.find((label) => label.name === this._labelName);

        if (!matchingLabel) {
            throw new Error(`Label with name ${this._labelName} not found`);
        }

        this._labelId = matchingLabel.id;
    }

    async getRelevantTasksForState() {
        await this._ensureInitialized();

        const filter = this._filterGenerator.getRelevantTasksForStateFilter(this._labelName, {
            includeFutureTasksWithLabel: !!this._includeFutureTasksWithLabel,
        });

        let relevantTasksFromApi = await this._performApiRequest(
            "get",
            `/tasks?filter=${encodeURIComponent(filter)}`
        );

        if (this._mergeSubtasksWithParent) {
            relevantTasksFromApi = this._merger.mergeSubtasksMarkedCurrentWithParentMarkedCurrent(
                relevantTasksFromApi,
                this._labelId
            );
        }

        return relevantTasksFromApi.map((task) => this._transformer.transform(task, this._labelId));
    }

    async performCleanup() {
        if (this._includeFutureTasksWithLabel) {
            return;
        }

        await this._ensureInitialized();

        const filter = this._filterGenerator.getFutureTasksWithLabelFilter(this._labelName);

        const tasksOnFutureDateWithLabel = await this._performApiRequest(
            "get",
            `/tasks?filter=${encodeURIComponent(filter)}`
        );

        for (const task of tasksOnFutureDateWithLabel) {
            await this._performApiRequest("post", `/tasks/${task.id}`, {
                label_ids: task.label_ids.filter((id) => id !== this._labelId),
            });
        }
    }

    async _performApiRequest(method, relativeUrl, data) {
        const callDescription = `Todoist ${method} ${relativeUrl}`;
        this._logger.debug(`Calling ${callDescription}`);

        try {
            const response = await axios({
                method,
                url: `https://api.todoist.com/rest/v1${relativeUrl}`,
                data,
                headers: { Authorization: `Bearer ${this._token}` },
                timeout: 60 * 1000, // one minute timeout to prevent calls from hanging eternally for whatever reason
            });

            this._logger.debug(`${callDescription} successful`);
            return response.data;
        } catch (error) {
            this._handleApiRequestError(callDescription, error);
        }
    }

    _handleApiRequestError(callDescription, error) {
        if (error.response && error.response.status === 403) {
            this._logger.debug(`${callDescription} auth error, status code 403`);
            throw new Error("Invalid Todoist token");
        } else {
            if (error.response) {
                this._logger.debug(
                    `${callDescription} general error, status code ${error.response.status}`
                );
            } else {
                this._logger.debug(`${callDescription} general error, no response received`);
            }

            throw new Error("Problem reaching Todoist");
        }
    }
}

module.exports = Todoist;