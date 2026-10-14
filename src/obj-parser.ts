import { Vector3, Vector2 } from "./math";

export interface ObjData {
    vertices: Vector3[];
    normals: Vector3[];
    uvs: Vector2[];
    faces: ObjFace[];
}

export interface ObjFace {
    vertexIndices: Vector3;
    normalIndices: Vector3;
    uvIndices: Vector3;
}

export const enum UVFlip {
    Original = "Original",
    Flipped = "Flipped",
}

const OBJ_INDEX_OFFSET = 1;
const VERTEX_PREFIX = "v ";
const NORMAL_PREFIX = "vn ";
const UV_PREFIX = "vt ";
const FACE_PREFIX = "f ";

export function parseObj(data: string, uvFlip: UVFlip): ObjData {
    const objData: ObjData = {
        vertices: [],
        normals: [],
        uvs: [],
        faces: [],
    };

    const lines = data.split("\n");

    for (const line of lines) {
        if (line === "" || line.startsWith("#")) {
            continue;
        }

        if (line.startsWith(VERTEX_PREFIX)) {
            // v x y z

            objData.vertices.push(
                line.split(VERTEX_PREFIX)[1].split(" ").map(Number) as Vector3
            );
        } else if (line.startsWith(NORMAL_PREFIX)) {
            // vn x y z

            objData.normals.push(
                line.split(NORMAL_PREFIX)[1].split(" ").map(Number) as Vector3
            );
        } else if (line.startsWith(UV_PREFIX)) {
            // vt u v

            const uv = line.split(UV_PREFIX)[1].split(" ").map(Number) as Vector2;
            if (uvFlip === UVFlip.Flipped) {
                uv[1] = 1 - uv[1];
            }

            objData.uvs.push(uv);
        } else if (line.startsWith(FACE_PREFIX)) {
            // f v/uv/n

            const vertices = line.split(FACE_PREFIX)[1].split(" ");

            const vertexIndices: Vector3 = [0, 0, 0];
            const normalIndices: Vector3 = [0, 0, 0];
            const uvIndices: Vector3 = [0, 0, 0];

            let i = 0;
            for (const vertex of vertices) {
                const [v, uv, n] = vertex.split("/").map(Number);

                vertexIndices[i] = v - OBJ_INDEX_OFFSET;
                normalIndices[i] = n - OBJ_INDEX_OFFSET;
                uvIndices[i] = uv - OBJ_INDEX_OFFSET;

                i++;
            }

            objData.faces.push({ vertexIndices, normalIndices, uvIndices });
        }
    }

    return objData;
}
