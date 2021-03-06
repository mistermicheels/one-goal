// this represents the part of the Trello API's card format that we care about
export interface TrelloCard {
    id: string;
    name: string;

    /** example value: 2020-09-27T10:11:00.000Z */
    due: string | null;

    labels: {
        id: string;
        name: string;
    }[];
}
