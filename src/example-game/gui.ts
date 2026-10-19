export class GUI {
    private _welcomeDisplay: HTMLParagraphElement;
    private _scoreDisplay!: HTMLParagraphElement;
    private _hpDisplay!: HTMLParagraphElement;

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
        warning.innerText = "This is a tech demo for my 3D software renderer/rasterizer \"Softy\".\nThis is about the rendering and the API.\nIt's not about the game. So don't expect a nice gameplay";
        this._welcomeDisplay.appendChild(warning);

        const megaWarning = document.createElement("p");
        megaWarning.innerText = "Also beware a flash when you get 5 points";
        megaWarning.style.color = "red";
        this._welcomeDisplay.appendChild(megaWarning);

        const letsGo = document.createElement("p");
        letsGo.innerText = "Press SPACE to start";
        letsGo.style.fontSize = "20pt";
        this._welcomeDisplay.appendChild(letsGo);

        const start = (event: KeyboardEvent) => {
            if (event.code === "Space") {
                document.body.removeChild(this._welcomeDisplay);

                this._createTheRestOfGui();
                unpause();

                removeEventListener("keypress", start);
            }
        }
        addEventListener("keypress", start);

        const footer = document.createElement("footer");
        footer.style.position = "fixed";
        footer.style.zIndex = "999";
        footer.style.bottom = "0%";
        footer.style.color = "white";
        footer.style.left = "50%";
        footer.style.transform = "translate(-50%, -50%)";
        document.body.appendChild(footer);

        const modelViewer = document.createElement("p");
        modelViewer.style.textAlign = "center";
        modelViewer.innerText = "Check out the other demo - ";
        footer.appendChild(modelViewer);
        const modelViewerLink = document.createElement("a");
        modelViewerLink.href = "https://irvingwash.github.io/softy-js/";
        modelViewerLink.target = "_blank";
        modelViewerLink.innerText = '"Model viewer"';
        modelViewer.appendChild(modelViewerLink);

        const aboutDisplay = document.createElement("p");
        aboutDisplay.style.textAlign = "center";
        aboutDisplay.innerText = "SoftyJS - ";
        footer.appendChild(aboutDisplay);
        const repoLink = document.createElement("a");
        repoLink.href = "https://github.com/IrvingWash/softy-js";
        repoLink.target = "_blank";
        repoLink.innerText = "github";
        aboutDisplay.appendChild(repoLink);
    }

    public updateScore(value: number, warp: boolean): void {
        this._scoreDisplay.innerText = `Score: ${value}${ warp ? ": W A R P - M O D E" : ""}`;
    }

    public updateHp(value: number): void {
        this._hpDisplay.innerText = `HP: ${value}`;
    }

    public showGameOver(): void {
        const gameOverDisplay = document.createElement("p");
        gameOverDisplay.innerText = "Game over";
        gameOverDisplay.style.position = "fixed";
        gameOverDisplay.style.zIndex = "999";
        gameOverDisplay.style.top = "50%";
        gameOverDisplay.style.left = "50%";
        gameOverDisplay.style.color = "white";
        gameOverDisplay.style.fontSize = "12pt";
        gameOverDisplay.style.transform = "translate(-50%, -50%)";
        gameOverDisplay.style.fontSize = "30px";
        gameOverDisplay.style.backgroundColor = "#333333";
        gameOverDisplay.style.padding = "20px";

        document.body.appendChild(gameOverDisplay);
    }

    private _createTheRestOfGui(): void {
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
}
