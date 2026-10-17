export class GUI {
    private _welcomeDisplay: HTMLParagraphElement;
    private _scoreDisplay: HTMLParagraphElement;
    private _hpDisplay: HTMLParagraphElement;

    public constructor(unpause: () => void) {
        this._welcomeDisplay = document.createElement("div");
        this._welcomeDisplay.style.zIndex = "999";
        this._welcomeDisplay.style.position = "fixed";
        this._welcomeDisplay.style.textAlign = "center";
        this._welcomeDisplay.style.top = "50%";
        this._welcomeDisplay.style.left = "50%";
        this._welcomeDisplay.style.color = "white";
        this._welcomeDisplay.style.fontSize = "12pt";
        this._welcomeDisplay.style.transform = "translate(-50%, -50%)";
        this._welcomeDisplay.style.width = "20%";
        this._welcomeDisplay.style.display = "flex";
        this._welcomeDisplay.style.flexDirection = "column";
        this._welcomeDisplay.style.gap = "20px";
        document.body.appendChild(this._welcomeDisplay);

        const controls = document.createElement("p");
        controls.innerText = "Controls:\nWASD - move\nK - shoot";
        this._welcomeDisplay.appendChild(controls);

        const warning = document.createElement("p");
        warning.innerText = "This is a tech demo for my 3D software renderer/rasterizer \"Softy\".\nThis is about the rendering and the API.\nSo don't expect a nice gameplay";
        this._welcomeDisplay.appendChild(warning);

        const megaWarning = document.createElement("p");
        megaWarning.innerText = "Also beware a flash when you get 5 points";
        megaWarning.style.color = "red";
        this._welcomeDisplay.appendChild(megaWarning);

        addEventListener("keypress", (event) => {
            if (event.code === "Space") {
                document.body.removeChild(this._welcomeDisplay);
                unpause();
            }
        });

        const letsGo = document.createElement("p");
        letsGo.innerText = "Press SPACE to start";
        letsGo.style.fontSize = "20pt";
        this._welcomeDisplay.appendChild(letsGo);

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
