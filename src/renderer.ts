import {
    Matrix4,
    Vector2,
    Vector3,
    Vector4,
    calculateFaceNormal,
    clamp,
    dotProduct,
    makeMatrix4Identity,
    makePerspectiveProjectionMatrix,
    multiplyMatrix4AndVector3,
    multiplyVector3s,
    normalize,
    projectVectorPerspective,
    scaleVector3,
    subtractVector3s,
} from "./math";

export enum PolygonMode {
    Filled = "Filled",
    Wireframe = "Wireframe",
}

export enum CullMode {
    BackFace = "BackFace",
    None = "None",
}

export interface DirectionalLight {
    direction: Vector3;
    color: Vector3;
}

export interface Camera {
    fov: number;
    zNear: number;
    zFar: number;
}

interface ICanvas {
    getPixelSize(): Vector2;
    getContext(): CanvasRenderingContext2D;
}

interface FrameBuffer {
    image: ImageData;
    colors: Uint32Array;
}

interface Face {
    vertexIndices: Vector3;
}

export class Renderer {
    private _canvas: ICanvas;
    private _cachedCanvasSize: Vector2;

    private _frameBuffer: FrameBuffer;
    private _clearColor: Vector3 = [0, 0, 0];
    private _zBuffer: Uint32Array;

    private _projectionMatrix: Matrix4 = makeMatrix4Identity();

    private _polygonMode: PolygonMode = PolygonMode.Filled;
    private _cullMode: CullMode = CullMode.BackFace;

    private _directionalLight: DirectionalLight | null = null;

    public constructor(canvas: ICanvas) {
        this._canvas = canvas;
        this._cachedCanvasSize = this._canvas.getPixelSize();

        this._frameBuffer = this._createFrameBuffer();
        this._zBuffer = this._createZBuffer();
    }

    public startDrawing(camera: Camera): void {
        this._clearFrameBuffer();
        this._clearZBuffer();

        this._projectionMatrix = makePerspectiveProjectionMatrix(
            this._cachedCanvasSize[1] / this._cachedCanvasSize[0],
            camera.fov,
            camera.zNear,
            camera.zFar,
        );
    }

    public finishDrawing(): void {
        const ctx = this._canvas.getContext();

        ctx.putImageData(this._frameBuffer.image, 0, 0);
    }

    public setClearColor(color: Vector3) {
        this._clearColor = color;
    }

    public getClearColor(): Vector3 {
        return this._clearColor;
    }

    public setPolygonMode(mode: PolygonMode): void {
        this._polygonMode = mode;
    }

    public getPolygonMode(): PolygonMode {
        return this._polygonMode;
    }

    public setCullMode(mode: CullMode): void {
        this._cullMode = mode;
    }

    public getCullMode(): CullMode {
        return this._cullMode;
    }

    public setDirectionalLight(light: DirectionalLight) {
        this._directionalLight = light;

        this._directionalLight.direction = normalize(this._directionalLight.direction);
    }

    public getDirectionalLight(): DirectionalLight | null {
        return this._directionalLight;
    }

    public draw(vertices: Vector3[], faces: Face[], modelTransform: Matrix4): void {
        interface TriangleToRender {
            positions: [Vector4, Vector4, Vector4];
            color: Vector3;
        }

        const trianglesToRender: TriangleToRender[] = [];

        for (const face of faces) {
            const a = vertices[face.vertexIndices[0]];
            const b = vertices[face.vertexIndices[1]];
            const c = vertices[face.vertexIndices[2]];

            const aTransformed = multiplyMatrix4AndVector3(modelTransform, a);
            const bTransformed = multiplyMatrix4AndVector3(modelTransform, b);
            const cTransformed = multiplyMatrix4AndVector3(modelTransform, c);

            const faceNormal = calculateFaceNormal(
                [aTransformed[0], aTransformed[1], aTransformed[2]],
                [bTransformed[0], bTransformed[1], bTransformed[2]],
                [cTransformed[0], cTransformed[1], cTransformed[2]],
            );

            switch (this._cullMode) {
                case CullMode.BackFace:
                    const originRay = subtractVector3s(
                        [0, 0, 0], // @Todo: the ray is casted from the origin, we should change this when we have a camera
                        [aTransformed[0], aTransformed[1], aTransformed[2]],
                    );
                    const alignment = dotProduct(faceNormal, originRay);

                    if (alignment <= 0) {
                        continue;
                    }

                    break;
                case CullMode.None:
                    // Do nothing
                    break;
                default:
                    exhaustiveCheck(this._cullMode);
            }

            let faceColor: Vector3 = [255, 255, 255];
            if (this._directionalLight) {
                const alignment = -dotProduct(faceNormal, this._directionalLight.direction);

                faceColor = calculateShadedColor(faceColor, this._directionalLight.color, alignment);
            }

            const aProjected = projectVectorPerspective(this._projectionMatrix, [aTransformed[0], aTransformed[1], aTransformed[2]]);
            const bProjected = projectVectorPerspective(this._projectionMatrix, [bTransformed[0], bTransformed[1], bTransformed[2]]);
            const cProjected = projectVectorPerspective(this._projectionMatrix, [cTransformed[0], cTransformed[1], cTransformed[2]]);

            trianglesToRender.push({
                positions: [aProjected, bProjected, cProjected],
                color: faceColor,
            });
        }

        for (const triangleToRender of trianglesToRender) {
            const [a, b, c] = triangleToRender.positions;

            switch (this._polygonMode) {
                case PolygonMode.Filled:
                    this._drawFilledTriangle(
                        this._transform_to_viewport_center(a),
                        this._transform_to_viewport_center(b),
                        this._transform_to_viewport_center(c),
                        triangleToRender.color,
                    );
                    break;
                case PolygonMode.Wireframe:
                    this._drawTriangle(
                        this._transform_to_viewport_center(a),
                        this._transform_to_viewport_center(b),
                        this._transform_to_viewport_center(c),
                        triangleToRender.color,
                    );
                    break;
                default:
                    exhaustiveCheck(this._polygonMode);
            }
        }
    }

    private _drawPixel(position: Vector2, color: Vector3): void {
        const [width, height] = this._cachedCanvasSize;

        if (
            position[0] >= width || position[0] < 0
            || position[1] >= height || position[1] < 0
        ) {
            return;
        }

        this._frameBuffer.colors[position[1] * width + position[0]] = toCanvasColorFormat(color);
    }

    private _drawFilledRectangle(position: Vector2, size: Vector2, color: Vector3): void {
        const [x, y] = position;
        const [width, height] = size;

        for (let w = 0; w < width; w++) {
            for (let h = 0; h < height; h++) {
                this._drawPixel([x + w, y + h], color);
            }
        }
    }

    private _drawLine(start: Vector2, end: Vector2, color: Vector3): void {
        const [startX, startY] = start;
        const [endX, endY] = end;

        const deltaX = endX - startX;
        const deltaY = endY - startY;

        const longestSideLength = Math.abs(deltaX) >= Math.abs(deltaY)
            ? Math.abs(deltaX)
            : Math.abs(deltaY);

        const xStep = deltaX / longestSideLength;
        const yStep = deltaY / longestSideLength;

        let currentX = startX;
        let currentY = startY;

        for (let i = 0; i <= longestSideLength; i++) {
            this._drawPixel([Math.round(currentX), Math.round(currentY)], color);

            currentX += xStep;
            currentY += yStep;
        }
    }

    private _drawTriangle(
        vertex1: Vector2,
        vertex2: Vector2,
        vertex3: Vector2,
        color: Vector3,
    ): void {
        this._drawLine(vertex1, vertex2, color);
        this._drawLine(vertex2, vertex3, color);
        this._drawLine(vertex3, vertex1, color);
    }

    private _drawFilledTriangle(
        vertex1: Vector2,
        vertex2: Vector2,
        vertex3: Vector2,
        color: Vector3,
    ): void {
        let [x0, y0] = vertex1;
        let [x1, y1] = vertex2;
        let [x2, y2] = vertex3;

        // Sort vertices so y0 is always the the top one, y1 is always the middle one, y2 is always the bottom one.
        // We need to know exactly where each vertex is vertically.
        if (y0 > y1) {
            [y0, y1] = [y1, y0];
            [x0, x1] = [x1, x0];
        }
        if (y1 > y2) {
            [y1, y2] = [y2, y1];
            [x1, x2] = [x2, x1];
        }
        if (y0 > y1) {
            [y0, y1] = [y1, y0];
            [x0, x1] = [x1, x0];
        }

        // The triangle is already flat-bottom
        if (y1 == y2) {
            this._drawFlatBottomTriangle(x0, y0, x1, y1, x2, y2, color);
            return;
        }

        // The triangle is already flat-top
        if (y0 == y1) {
            this._drawFlatTopTriangle(x0, y0, x1, y1, x2, y2, color);
            return;
        }


        // Find the other end of the middle separator (M) (the first end is x1 y1)
        const My = y1;
        const Mx = (x2 - x0) * (y1 - y0) / (y2 - y0) + x0;

        this._drawFlatBottomTriangle(x0, y0, x1, y1, Mx, My, color);

        this._drawFlatTopTriangle(x1, y1, Mx, My, x2, y2, color);
    }

    private _drawFlatBottomTriangle(
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        color: Vector3,
    ): void {
        if (y1 - y0 == 0 || y2 - y0 == 0) {
            return;
        }

        const inverseSlope1 = (x1 - x0) / (y1 - y0);
        const inverseSlope2 = (x2 - x0) / (y2 - y0);

        let startX = x0;
        let endX = x0;

        for (let y = y0; y <= y2; y++) {
            this._drawLine([startX, y], [endX, y], color);

            startX += inverseSlope1;
            endX += inverseSlope2;
        }
    }

    private _drawFlatTopTriangle(
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        color: Vector3,
    ): void {
        if (y2 - y0 == 0 || y2 - y1 == 0) {
            return;
        }

        const inverseSlope1 = (x2 - x0) / (y2 - y0);
        const inverseSlope2 = (x2 - x1) / (y2 - y1);

        let startX = x2;
        let endX = x2;

        for (let y = y2; y >= y0; y--) {
            this._drawLine([startX, y], [endX, y], color);

            startX -= inverseSlope1;
            endX -= inverseSlope2;
        }
    }

    private _clearZBuffer(): void {
        this._zBuffer.fill(0);
    }

    private _createZBuffer(): Uint32Array {
        const [width, height] = this._cachedCanvasSize;

        return new Uint32Array(width * height);
    }

    private _clearFrameBuffer(): void {
        this._frameBuffer.colors.fill(toCanvasColorFormat(this._clearColor));
    }

    private _createFrameBuffer(): FrameBuffer {
        const ctx = this._canvas.getContext();

        const [width, height] = this._cachedCanvasSize;

        const image = ctx.createImageData(width, height);
        const colorBuffer = new Uint32Array(image.data.buffer);

        return {
            image,
            colors: colorBuffer,
        };
    }

    private _transform_to_viewport_center(v: Vector4): Vector2 {
        const [width, height] = this._cachedCanvasSize;

        return [
            (v[0] + 1) / 2 * width,
            (1 - v[1]) / 2 * height,
        ];
    }
}

// RGBA to AABBGGRR
function toCanvasColorFormat(color: Vector3, a: number = 255): number {
    const [r, g, b] = color;

    return (a << 24) | (b << 16) | (g << 8) | r;
}

function exhaustiveCheck(value: never): never {
    return value;
}

function calculateShadedColor(originalColor: Vector3, lightColor: Vector3, factor: number): Vector3 {
    factor = clamp(factor, 0, 1);

    const result: Vector3 = scaleVector3(multiplyVector3s(originalColor, lightColor), factor / 255);

    return result;
}
