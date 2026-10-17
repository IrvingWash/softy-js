export class GUI {
    private _scoreDisplay: HTMLParagraphElement;

    public constructor() {
        this._scoreDisplay = document.createElement("p");
        this._scoreDisplay.innerText = "Score: 0";
        this._scoreDisplay.style.zIndex = "999";
        this._scoreDisplay.style.position = "fixed";
        this._scoreDisplay.style.textAlign = "center";
        this._scoreDisplay.style.top = "5%";
        this._scoreDisplay.style.left = "5%";
        this._scoreDisplay.style.color = "white";
        this._scoreDisplay.style.fontSize = "16px";

        document.body.appendChild(this._scoreDisplay);
    }

    public updateScore(value: number, warp: boolean): void {
        this._scoreDisplay.innerText = `Score: ${value}${ warp ? ": W A R P   M O D E" : ""}`;
    }
}
