export type Matrix4 = [Vector4, Vector4, Vector4, Vector4];

export type Vector2 = [number, number];
export type Vector3 = [number, number, number];
export type Vector4 = [number, number, number, number];

export interface BarycentricWeights {
    alpha: number;
    beta: number;
    gamma: number;
}

export function makeMatrix4Identity(): Matrix4 {
    return [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
    ];
}

/*
| (height/width) * 1 / tan(fov/2) |        0       |             0            |                   0                  |
|                 0               | 1 / tan(fov/2) |             0            |                   0                  |
|                 0               |        0       | z_far / (z_far - z_near) | -(z_far / (z_far - z_near)) * z_near |
|                 0               |        0       |             1            |                   0                  |

z is normalized between 0 to 1
Left-handed
*/
export function makePerspectiveProjectionMatrix(
    aspectRatioVerticalOverHorizontal: number,
    fovInRadians: number,
    zNear: number,
    zFar: number,
): Matrix4 {
    const matrix = makeEmptyMatrix4();

    const fovFactor = 1 / Math.tan(fovInRadians / 2);

    matrix[0][0] = aspectRatioVerticalOverHorizontal * fovFactor;
    matrix[1][1] = fovFactor;

    const zScale = zFar / (zFar - zNear);
    const zTranslation = -zScale * zNear;
    
    matrix[2][2] = zScale;
    matrix[2][3] = zTranslation;

    matrix[3][2] = 1;

    return matrix;
}

export function multiplyVector3s(a: Vector3, b: Vector3): Vector3 {
    return [
        a[0] * b[0],
        a[1] * b[1],
        a[2] * b[2],
    ];
}

export function multiplyMatrix4s(a: Matrix4, b: Matrix4): Matrix4 {
    const result = makeEmptyMatrix4();

    for (let i = 0; i <= 3; i++) {
        for (let j = 0; j <= 3; j++) {
            result[i][j] = a[i][0] * b[0][j]
                + a[i][1] * b[1][j]
                + a[i][2] * b[2][j]
                + a[i][3] * b[3][j];
        }
    }

    return result;
}

export function multiplyMatrix4AndVector3(m: Matrix4, v: Vector3): Vector4 {
    const result = makeEmptyVector4();

    result[0] = m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2] + m[0][3];
    result[1] = m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2] + m[1][3];
    result[2] = m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2] + m[2][3];
    result[3] = m[3][0] * v[0] + m[3][1] * v[1] + m[3][2] * v[2] + m[3][3];

    return result;
}

export function projectVectorPerspective(matrix: Matrix4, vector: Vector3): Vector4 {
    const result = multiplyMatrix4AndVector3(matrix, vector);

    if (result[3] != 0) {
        result[0] /= result[3];
        result[1] /= result[3];
        result[2] /= result[3];
    }

    return result;
}

/*
| sx 0  0  0 |
| 0  sy 0  0 |
| 0  0  sz 0 |
| 0  0  0  1 |
*/
export function makeScaleMatrix(v: Vector3): Matrix4 {
    const matrix = makeMatrix4Identity();

    matrix[0][0] = v[0];
    matrix[1][1] = v[1];
    matrix[2][2] = v[2];

    return matrix;
}

/*
| 1 0 0 tx |
| 0 1 0 ty |
| 0 0 1 tz |
| 0 0 0  1 |
*/
export function makeTranslationMatrix(v: Vector3): Matrix4 {
    const matrix = makeMatrix4Identity();

    matrix[0][3] = v[0];
    matrix[1][3] = v[1];
    matrix[2][3] = v[2];

    return matrix;
}

/*
| 1 0  0 0 |
| 0 c -s 0 |
| 0 s  c 0 |
| 0 0  0 1 |
*/
export function makeRotationAroundXMatrix(angle: number): Matrix4 {
    const matrix = makeMatrix4Identity();

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    matrix[1][1] = c;
    matrix[1][2] = -s;
    matrix[2][1] = s;
    matrix[2][2] = c;

    return matrix;
}

/*
|  c 0 s 0 |
|  0 1 0 0 |
| -s 0 c 0 |
|  0 0 0 1 |
*/
export function makeRotationAroundYMatrix(angle: number): Matrix4 {
    const matrix = makeMatrix4Identity();

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    matrix[0][0] = c;
    matrix[0][2] = s;
    matrix[2][0] = -s;
    matrix[2][2] = c;

    return matrix;
}

/*
| c -s 0 0 |
| s  c 0 0 |
| 0  0 1 0 |
| 0  0 0 1 |
*/
export function makeRotationAroundZMatrix(angle: number): Matrix4 {
    const matrix = makeMatrix4Identity();

    const c = Math.cos(angle);
    const s = Math.sin(angle);

    matrix[0][0] = c;
    matrix[0][1] = -s;
    matrix[1][0] = s;
    matrix[1][1] = c;

    return matrix;
}

export function makeEmptyMatrix4(): Matrix4 {
    return [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];
}

export function makeEmptyVector4(): Vector4 {
    return [0, 0, 0, 0];
}

export function makeEmptyVector3(): Vector3 {
    return [0, 0, 0];
}

export function makeEmptyVector2(): Vector2 {
    return [0, 0];
}

export function subtractVector3s(a: Vector3, b: Vector3): Vector3 {
    const result = makeEmptyVector3();

    result[0] = a[0] - b[0];
    result[1] = a[1] - b[1];
    result[2] = a[2] - b[2];

    return result;
}

export function subtractVector2s(a: Vector2, b: Vector2): Vector2 {
    const result = makeEmptyVector2();

    result[0] = a[0] - b[0];
    result[1] = a[1] - b[1];

    return result;
}

export function subtractVector4s(a: Vector4, b: Vector4): Vector4 {
    const result = makeEmptyVector4();

    result[0] = a[0] - b[0];
    result[1] = a[1] - b[1];
    result[2] = a[2] - b[2];
    result[3] = a[3] - b[3];

    return result;
}

export function dotProduct(a: Vector3, b: Vector3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function crossProduct(a: Vector3, b: Vector3): Vector3 {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

export function crossProductVector2(a: Vector2, b: Vector2): number {
    return a[0] * b[1] - a[1] * b[0];
}

export function magnitude(v: Vector3): number {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function normalize(v: Vector3): Vector3 {
    const length = magnitude(v);

    return divideVector3(v, length);
}

export function divideVector3(v: Vector3, s: number): Vector3 {
    return [v[0] / s, v[1] / s, v[2] / s];
}

export function calculateFaceNormal(a: Vector3, b: Vector3, c: Vector3): Vector3 {
    const vectorAB = subtractVector3s(b, a);
    const vectorAC = subtractVector3s(c, a);

    const normal = normalize(crossProduct(vectorAB, vectorAC));

    return normal;
}

export function scaleVector2(v: Vector2, s: number): Vector2 {
    return [v[0] * s, v[1] * s];
}

export function scaleVector3(v: Vector3, s: number): Vector3 {
    return [v[0] * s, v[1] * s, v[2] * s];
}

export function clamp(v: number, min: number, max: number): number {
    return Math.min(Math.max(v, min), max);
};

export function calculateBarycentricWeights(a: Vector2, b: Vector2, c: Vector2, p: Vector2): BarycentricWeights {
    const ac = subtractVector2s(c, a);
    const ab = subtractVector2s(b, a);
    const pc = subtractVector2s(c, p);
    const pb = subtractVector2s(b, p);
    const ap = subtractVector2s(p, a);

    const doubledTriangleArea = crossProductVector2(ac, ab);

    const alpha = crossProductVector2(pc, pb) / doubledTriangleArea;
    const beta = crossProductVector2(ac, ap) / doubledTriangleArea;

    return {
        alpha,
        beta,
        gamma: 1 - alpha - beta,
    }
}

const FACTOR = Math.PI / 180;
export function degreesToRadians(degrees: number): number {
    return degrees * FACTOR;
}

// | x.x, x.y, x.z, -dot(x,eye) | //
// | y.x, y.y, y.z, -dot(y,eye) | //
// | z.x, z.y, z.z, -dot(z,eye) | //
// |  0    0    0        1      | //
// Left-handed
export function makeLookAtMatrix(eye: Vector3, target: Vector3, worldUp: Vector3): Matrix4 {
    const z = normalize(subtractVector3s(target, eye));       // Vector pointing from eye to target
    const x = normalize(crossProduct(worldUp, z)); // Perpendicular vector to world_up and z
    const y = crossProduct(z, x);                   // Perpendicular vector to z and x

    const matrix = makeMatrix4Identity();

    matrix[0][0] = x[0];
    matrix[0][1] = x[1];
    matrix[0][2] = x[2];
    matrix[0][3] = -dotProduct(x, eye);

    matrix[1][0] = y[0];
    matrix[1][1] = y[1];
    matrix[1][2] = y[2];
    matrix[1][3] = -dotProduct(y, eye);

    matrix[2][0] = z[0];
    matrix[2][1] = z[1];
    matrix[2][2] = z[2];
    matrix[2][3] = -dotProduct(z, eye);

    return matrix;
}
