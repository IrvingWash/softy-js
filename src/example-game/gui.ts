export class GUI {
    private _scoreDisplay: HTMLParagraphElement;
    private _hpDisplay: HTMLParagraphElement;

    public constructor() {
        this._scoreDisplay = document.createElement("p");
        this._scoreDisplay.innerText = "Score: 0";
        this._scoreDisplay.style.zIndex = "999";
        this._scoreDisplay.style.position = "fixed";
        this._scoreDisplay.style.textAlign = "center";
        this._scoreDisplay.style.top = "5%";
        this._scoreDisplay.style.left = "5%";
        this._scoreDisplay.style.color = "white";
        this._scoreDisplay.style.fontSize = "20pt";

        document.body.appendChild(this._scoreDisplay);

        this._hpDisplay = document.createElement("p");
        this._hpDisplay.innerText = "HP: 0";
        this._hpDisplay.style.zIndex = "999";
        this._hpDisplay.style.position = "fixed";
        this._hpDisplay.style.textAlign = "center";
        this._hpDisplay.style.top = "10%";
        this._hpDisplay.style.left = "5%";
        this._hpDisplay.style.color = "white";
        this._hpDisplay.style.fontSize = "20pt";

        document.body.appendChild(this._hpDisplay);
    }

    public updateScore(value: number, warp: boolean): void {
        this._scoreDisplay.innerText = `Score: ${value}${ warp ? ": W A R P - M O D E" : ""}`;
    }

    public updateHp(value: number): void {
        this._hpDisplay.innerText = `HP: ${value}`;
    }
}
