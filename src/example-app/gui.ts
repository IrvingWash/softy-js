import { Canvas } from "../canvas";
import { Vector2, Vector3 } from "../math";

interface DragState {
    isDragging: boolean;
    lastX: number;
    lastY: number;
    delta: Vector2;
}

// This sucks, but it's not the goal of this project!

export class GUI {
    private _dragState: DragState = {
        isDragging: false,
        lastX: 0,
        lastY: 0,
        delta: [0, 0],
    };

    private _isVisible: boolean = true;

    private _menuWrapper: HTMLDivElement;
    private _loadingDisplay: HTMLParagraphElement | null = null;
    private _tintPicker!: HTMLInputElement;
    private _clearColorPicker!: HTMLInputElement;
    private _depthTestCheckbox!: HTMLInputElement;
    private _directionalLightColorPicker!: HTMLInputElement;

    public constructor(
        canvas: Canvas,
        availableModelNames: string[],
        currentModelName: string,
        onModelSelect: (modelName: string) => Promise<void>,
        onTintSelect: (tint: Vector3) => void,
        onClearColorSelect: (color: Vector3) => void,
        availableRenderModes: string[],
        onRenderModeSelect: (mode: string) => void,
        availableCullModes: string[],
        onCullModeSelect: (mode: string) => void,
        onDepthTestToggle: (enabled: boolean) => void,
        onDirectionalLightColorSelect: (color: Vector3) => void,
        onDirectionalLightXDirectionChange: (x: number) => void,
        onDirectionalLightYDirectionChange: (y: number) => void,
        onDirectionalLightZDirectionChange: (z: number) => void,
    ) {
        this._setupDragControls(canvas);

        this._menuWrapper = this._createMenuWrapper();
        this._createHideButton();

        this._createEntitySubmenu(
            availableModelNames,
            currentModelName,
            onModelSelect,
            onTintSelect,
            "20px 0",
        );

        this._createRendererSubmenu(
            onClearColorSelect,
            availableRenderModes,
            onRenderModeSelect,
            availableCullModes,
            onCullModeSelect,
            onDepthTestToggle,
            "20px 0",
        );

        this._createDirectionalLightSubmenu(
            onDirectionalLightColorSelect,
            onDirectionalLightXDirectionChange,
            onDirectionalLightYDirectionChange,
            onDirectionalLightZDirectionChange,
            "0",
        );
    }

    public update(
        tint: Vector3,
        clearColor: Vector3,
        depthTesting: boolean,
        directionalLightColor: Vector3,
    ): void {
        this._tintPicker.value = vector3ColorToCssHex(tint);
        this._clearColorPicker.value = vector3ColorToCssHex(clearColor);
        this._depthTestCheckbox.checked = depthTesting;
        this._directionalLightColorPicker.value = vector3ColorToCssHex(directionalLightColor);
    }

    public consumeDragState(): DragState {
        const copy = { ...this._dragState };

        this._dragState.delta = [0, 0];

        return copy;
    }

    public showLoadingText(backgroundColor: Vector3): void {
        if (!this._loadingDisplay) {
            this._loadingDisplay = document.createElement("p");
            this._loadingDisplay.style.position = "fixed";
            this._loadingDisplay.style.zIndex = "999";
            this._loadingDisplay.style.textAlign = "center";
            this._loadingDisplay.style.top = "50%";
            this._loadingDisplay.style.left = "50%";

            // Inverse color of the background, though the API sucks a bit
            this._loadingDisplay.style.color = `rgb(${255 - backgroundColor[0]}, ${255 - backgroundColor[1]}, ${255 - backgroundColor[2]})`;

            this._loadingDisplay.innerText = "Loading...";
        }

        document.body.appendChild(this._loadingDisplay);
    }

    public hideLoadingText(): void {
        if (!this._loadingDisplay) {
            return;
        }

        document.body.removeChild(this._loadingDisplay);
    }

    private _createDirectionalLightSubmenu(
        onColorSelect: (color: Vector3) => void,
        onXDirectionChange: (x: number) => void,
        onYDirectionChange: (y: number) => void,
        onZDirectionChange: (z: number) => void,
        margin: string,
    ): void {
        const directionalLightWrapper = document.createElement("div");
        directionalLightWrapper.style.display = "flex";
        directionalLightWrapper.style.flexDirection = "column";
        directionalLightWrapper.style.justifyContent = "space-between";
        directionalLightWrapper.style.margin = margin;

        this._menuWrapper.appendChild(directionalLightWrapper);

        { // Title
            const directionalLightTitle = document.createElement("h3");
            directionalLightTitle.innerText = "Directional light";
            directionalLightTitle.style.marginBottom = "5px";
            directionalLightWrapper.appendChild(directionalLightTitle);
        }

        { // Color
            const directionalLightColorLabel = document.createElement("label");
            directionalLightColorLabel.innerText = "Color";
            directionalLightWrapper.appendChild(directionalLightColorLabel);

            this._directionalLightColorPicker = document.createElement("input");
            this._directionalLightColorPicker.type = "color";

            this._directionalLightColorPicker.addEventListener("input", () => {
                onColorSelect(cssHexToVector3Color(this._directionalLightColorPicker.value));
            });

            directionalLightWrapper.appendChild(this._directionalLightColorPicker);
        }

        { // X direction
            const directionalLightXDirectionLabel = document.createElement("label");
            directionalLightXDirectionLabel.innerText = "X direction";
            directionalLightWrapper.appendChild(directionalLightXDirectionLabel);

            const directionalLightXDirectionSlider = document.createElement("input");
            directionalLightXDirectionSlider.type = "range";
            directionalLightXDirectionSlider.min = "0";
            directionalLightXDirectionSlider.max = "1";
            directionalLightXDirectionSlider.step = "0.1";
            directionalLightXDirectionSlider.addEventListener("input", () => {
                onXDirectionChange(Number(directionalLightXDirectionSlider.value));
            });
            directionalLightWrapper.appendChild(directionalLightXDirectionSlider);
        }
        { // Y direction
            const directionalLightYDirectionLabel = document.createElement("label");
            directionalLightYDirectionLabel.innerText = "Y direction";
            directionalLightWrapper.appendChild(directionalLightYDirectionLabel);

            const directionalLightYDirectionSlider = document.createElement("input");
            directionalLightYDirectionSlider.type = "range";
            directionalLightYDirectionSlider.min = "0";
            directionalLightYDirectionSlider.max = "1";
            directionalLightYDirectionSlider.step = "0.1";
            directionalLightYDirectionSlider.addEventListener("input", () => {
                onYDirectionChange(Number(directionalLightYDirectionSlider.value));
            });
            directionalLightWrapper.appendChild(directionalLightYDirectionSlider);
        }
        { // Z direction
            const directionalLightZDirectionLabel = document.createElement("label");
            directionalLightZDirectionLabel.innerText = "Z direction";
            directionalLightWrapper.appendChild(directionalLightZDirectionLabel);

            const directionalLightZDirectionSlider = document.createElement("input");
            directionalLightZDirectionSlider.type = "range";
            directionalLightZDirectionSlider.min = "0";
            directionalLightZDirectionSlider.max = "1";
            directionalLightZDirectionSlider.step = "0.1";
            directionalLightZDirectionSlider.addEventListener("input", () => {
                onZDirectionChange(Number(directionalLightZDirectionSlider.value));
            });
            directionalLightWrapper.appendChild(directionalLightZDirectionSlider);
        }
    }

    private _createEntitySubmenu(
        availableModelNames: string[],
        currentModelName: string,
        onModelSelect: (modelName: string) => Promise<void>,
        onTintSelect: (tint: Vector3) => void,
        margin: string,
    ): void {
        const entityWrapper = document.createElement("div");
        entityWrapper.style.display = "flex";
        entityWrapper.style.flexDirection = "column";
        entityWrapper.style.justifyContent = "space-between";
        entityWrapper.style.margin = margin;

        this._menuWrapper.appendChild(entityWrapper);

        { // Tilte
            const entityTitle = document.createElement("h3");
            entityTitle.innerText = "Entity";
            entityTitle.style.marginBottom = "5px";
            entityWrapper.appendChild(entityTitle);
        }

        { // Model select
            const modelDropdown = document.createElement("select");
            modelDropdown.style.marginBottom = "5px";

            for (const modelName of availableModelNames) {
                const option = document.createElement("option");
                option.value = modelName;
                option.innerText = modelName;

                modelDropdown.appendChild(option);
            }

            modelDropdown.value = currentModelName;

            modelDropdown.addEventListener("change", async () => {
                await onModelSelect(modelDropdown.value);
            });

            entityWrapper.appendChild(modelDropdown);
        }

        { // Tint
            const tintLabel = document.createElement("label");
            tintLabel.innerText = "Tint";
            entityWrapper.appendChild(tintLabel);

            this._tintPicker = document.createElement("input");
            this._tintPicker.type = "color";

            this._tintPicker.addEventListener("input", () => {
                onTintSelect(cssHexToVector3Color(this._tintPicker.value));
            });

            entityWrapper.appendChild(this._tintPicker);
        }

        { // Help text
            const helpDisplay = document.createElement("p");
            helpDisplay.style.marginTop = "10px";
            helpDisplay.innerText = "You can rotate the model by clicking and dragging";

            entityWrapper.appendChild(helpDisplay);
        }
    }

    private _createHideButton(): void {
        const id = "hideButton";
        const hideText = "Hide";
        const showText = "Show";

        const button = document.createElement("button");
        button.style.width = "40px";
        button.innerText = hideText;
        button.id = id;

        this._menuWrapper.appendChild(button);

        button.addEventListener("click", () => {
            for (const child of this._menuWrapper.children) {
                if (this._isVisible) {
                    if (child.id === id) {
                        button.innerText = showText;
                        continue;
                    }

                    (child as HTMLElement).style.display = "none";
                } else {
                    if (child.id === id) {
                        button.innerText = hideText;
                        continue;
                    }

                    (child as HTMLElement).style.display = "flex";
                }
            }

            this._isVisible = !this._isVisible;
        });
    }

    private _setupDragControls(canvas: Canvas): void {
        const canvasElement = canvas.getElement();

        canvasElement.addEventListener("pointerdown", (event) => {
            canvasElement.style.cursor = "all-scroll";
            canvasElement.setPointerCapture(event.pointerId);

            this._dragState = {
                ...this._dragState,
                isDragging: true,
                lastX: event.clientX,
                lastY: event.clientY,
            };
        });

        canvasElement.addEventListener("pointerup", (event) => {
            canvasElement.style.cursor = "default";
            canvasElement.releasePointerCapture(event.pointerId);

            this._dragState.isDragging = false;
        });

        canvasElement.addEventListener("pointermove", (event) => {
            if (!this._dragState.isDragging) {
                return;
            }

            this._dragState.delta = [
                event.clientX - this._dragState.lastX,
                event.clientY - this._dragState.lastY,
            ];

            this._dragState.lastX = event.clientX;
            this._dragState.lastY = event.clientY;
        });
    }

    private _createMenuWrapper(): HTMLDivElement {
        const menuWrapper = document.createElement("div");
        menuWrapper.style.zIndex = "999";
        menuWrapper.style.position = "fixed";
        menuWrapper.style.backgroundColor = "white";
        menuWrapper.style.margin = "5px";
        menuWrapper.style.padding = "5px";
        menuWrapper.style.display = "flex";
        menuWrapper.style.flexDirection = "column";
        menuWrapper.style.border = "1px solid black";
        menuWrapper.style.width = "15%";

        document.body.appendChild(menuWrapper);

        return menuWrapper;
    }

    private _createRendererSubmenu(
        onClearColorSelect: (color: Vector3) => void,
        availableRenderModes: string[],
        onRenderModeSelect: (mode: string) => void,
        availableCullModes: string[],
        onCullModeSelect: (mode: string) => void,
        onDepthTestToggle: (enabled: boolean) => void,
        margin: string,
    ): void {
        const rendererWrapper = document.createElement("div");
        rendererWrapper.style.display = "flex";
        rendererWrapper.style.flexDirection = "column";
        rendererWrapper.style.justifyContent = "space-between";
        rendererWrapper.style.margin = margin;

        this._menuWrapper.appendChild(rendererWrapper);


        { // Title
            const rendererTitle = document.createElement("h3");
            rendererTitle.innerText = "Renderer";
            rendererTitle.style.marginBottom = "5px";
            rendererWrapper.appendChild(rendererTitle);
        }

        { // Clear color
            const clearColorLabel = document.createElement("label");
            clearColorLabel.innerText = "Clear color";
            rendererWrapper.appendChild(clearColorLabel);

            this._clearColorPicker = document.createElement("input");
            this._clearColorPicker.type = "color";

            this._clearColorPicker.addEventListener("input", () => {
                onClearColorSelect(cssHexToVector3Color(this._clearColorPicker.value));
            });

            rendererWrapper.appendChild(this._clearColorPicker);
        }

        { // Render mode
            const renderModeLabel = document.createElement("label");
            renderModeLabel.innerText = "Render mode";
            rendererWrapper.appendChild(renderModeLabel);

            const renderModeDropdown = document.createElement("select");
            renderModeDropdown.style.marginBottom = "5px";

            for (const renderMode of availableRenderModes) {
                const option = document.createElement("option");
                option.value = renderMode;
                option.innerText = renderMode;

                renderModeDropdown.appendChild(option);
            }

            renderModeDropdown.addEventListener("change", () => {
                onRenderModeSelect(renderModeDropdown.value);
            });

            rendererWrapper.appendChild(renderModeDropdown);
        }

        { // Cull mode
            const cullModeLabel = document.createElement("label");
            cullModeLabel.innerText = "Cull mode";
            rendererWrapper.appendChild(cullModeLabel);

            const cullModeDropdown = document.createElement("select");
            cullModeDropdown.style.marginBottom = "5px";

            for (const cullMode of availableCullModes) {
                const option = document.createElement("option");
                option.value = cullMode;
                option.innerText = cullMode;

                cullModeDropdown.appendChild(option);
            }

            cullModeDropdown.addEventListener("change", () => {
                onCullModeSelect(cullModeDropdown.value);
            });

            rendererWrapper.appendChild(cullModeDropdown);
        }

        { // Depth testing
            const depthTestWrapper = document.createElement("div");
            depthTestWrapper.style.display = "flex";
            depthTestWrapper.style.justifyContent = "space-between";
            rendererWrapper.appendChild(depthTestWrapper);

            const depthTestLabel = document.createElement("label");
            depthTestLabel.innerText = "Depth testing";
            depthTestWrapper.appendChild(depthTestLabel);

            this._depthTestCheckbox = document.createElement("input");
            this._depthTestCheckbox.type = "checkbox";
            this._depthTestCheckbox.style.margin = "0 auto";

            this._depthTestCheckbox.addEventListener("change", () => {
                onDepthTestToggle(this._depthTestCheckbox.checked);
            });

            depthTestWrapper.appendChild(this._depthTestCheckbox);
        }
    }

    // private _createGui() { // This is a dumpster...
    //     { // Renderer
    //         { // Directional Light
    //             const directionalLightWrapper = document.createElement("div");
    //             directionalLightWrapper.style.display = "flex";
    //             directionalLightWrapper.style.justifyContent = "space-between";
    //             directionalLightWrapper.style.margin = menuItemWrapperMargin;
    //             rendererWrapper.appendChild(directionalLightWrapper);
    //
    //             const directionalLightLabel = document.createElement("label");
    //             directionalLightLabel.innerText = "Directional light";
    //             directionalLightWrapper.appendChild(directionalLightLabel);
    //
    //             { // Color
    //                 const colorInput = document.createElement("input");
    //                 colorInput.type = "color";
    //                 colorInput.value = "#" + (this._renderer.getDirectionalLight()?.color ?? SUN_COLOR)
    //                     .map(c => Math.round(c).toString(16).padStart(2, "0"))
    //                     .join("");
    //                 directionalLightWrapper.appendChild(colorInput);
    //
    //                 colorInput.addEventListener("input", () => {
    //                     const currentDirection = this._renderer.getDirectionalLight()?.direction ?? SUN_DIRECTION;
    //
    //                     this._renderer.setDirectionalLight(
    //                         {
    //                             direction: currentDirection,
    //                             color: [
    //                                 parseInt(colorInput.value.slice(1, 3), 16),
    //                                 parseInt(colorInput.value.slice(3, 5), 16),
    //                                 parseInt(colorInput.value.slice(5, 7), 16),
    //                             ]
    //                         }
    //                     );
    //                 });
    //             }
    //
    //             { // Direction
    //                 function createSlider(initialValue: number): HTMLInputElement {
    //                     const slider = document.createElement("input");
    //                     slider.value = String(initialValue);
    //                     slider.type = "range";
    //                     slider.min = "0";
    //                     slider.max = "1";
    //                     slider.step = "0.05";
    //                     slider.style.width = "50px";
    //
    //                     return slider;
    //                 }
    //
    //                 const currentDirection = this._renderer.getDirectionalLight()?.direction ?? SUN_DIRECTION;
    //
    //                 const xSlider = createSlider(currentDirection[0]);
    //                 const ySlider = createSlider(currentDirection[1]);
    //                 const zSlider = createSlider(currentDirection[2]);
    //
    //                 directionalLightWrapper.appendChild(xSlider);
    //                 directionalLightWrapper.appendChild(ySlider);
    //                 directionalLightWrapper.appendChild(zSlider);
    //
    //                 xSlider.addEventListener("input", () => {
    //                     const currentDirectionalLight = this._renderer.getDirectionalLight() ?? {
    //                         color: SUN_COLOR,
    //                         direction: SUN_DIRECTION,
    //                     }
    //
    //                     this._renderer.setDirectionalLight(
    //                         {
    //                             color: [...currentDirectionalLight.color],
    //                             direction: [Number(xSlider.value), currentDirectionalLight.direction[1], currentDirectionalLight.direction[2]],
    //                         }
    //                     );
    //                 });
    //                 ySlider.addEventListener("input", () => {
    //                     const currentDirectionalLight = this._renderer.getDirectionalLight() ?? {
    //                         color: SUN_COLOR,
    //                         direction: SUN_DIRECTION,
    //                     }
    //
    //                     this._renderer.setDirectionalLight(
    //                         {
    //                             color: [...currentDirectionalLight.color],
    //                             direction: [currentDirectionalLight.direction[0], Number(ySlider.value), currentDirectionalLight.direction[2]],
    //                         }
    //                     );
    //                 });
    //                 zSlider.addEventListener("input", () => {
    //                     const currentDirectionalLight = this._renderer.getDirectionalLight() ?? {
    //                         color: SUN_COLOR,
    //                         direction: SUN_DIRECTION,
    //                     }
    //
    //                     this._renderer.setDirectionalLight(
    //                         {
    //                             color: [...currentDirectionalLight.color],
    //                             direction: [currentDirectionalLight.direction[0], currentDirectionalLight.direction[1], Number(zSlider.value)],
    //                         }
    //                     );
    //                 });
    //             }
    //         }
    //     }
    //
    //     { // FPS
    //         const fpsDisplay = document.createElement("p");
    //         fpsDisplay.innerText = "FPS: 0";
    //
    //         setInterval(() => fpsDisplay.innerText = `FPS: ${Math.round(1 / this._deltaTime)}`, 1000);
    //
    //         menuWrapper.appendChild(fpsDisplay);
    //     }
    // }
}

function cssHexToVector3Color(hex: string): Vector3 {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
}

function vector3ColorToCssHex(color: Vector3): string {
    return "#" + color
        .map(c => Math.round(c).toString(16).padStart(2, "0"))
        .join("");
}
