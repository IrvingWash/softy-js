export type Matrix4 = [Vector4, Vector4, Vector4, Vector4];

export type Vector2 = [number, number];
export type Vector3 = [number, number, number];
export type Vector4 = [number, number, number, number];


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

function makeEmptyMatrix4(): Matrix4 {
    return [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];
}

function makeEmptyVector4(): Vector4 {
    return [0, 0, 0, 0];
}
