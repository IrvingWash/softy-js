import { vec3 } from "gl-matrix";

export interface ObjData {
    vertices: vec3[];
    faces: ObjFace[];
}

export interface ObjFace {
    vertex_indices: vec3;
}

const OBJ_INDEX_OFFSET = 1;
const VERTEX_PREFIX = "v ";
const FACE_PREFIX = "f ";

export function parseObj(data: string): ObjData {
    const objData: ObjData = {
        vertices: [],
        faces: [],
    };

    const lines = data.split("\n");

    for (const line of lines) {
        if (line == "" || line.startsWith("#")) {
            continue;
        }

        if (line.startsWith(VERTEX_PREFIX)) {
            // v x y z

            objData.vertices.push(
                line.split(VERTEX_PREFIX)[1].split(" ").map(Number)
            );
        } else if (line.startsWith(FACE_PREFIX)) {
            // f v/uv/n

            const vertices = line.split(FACE_PREFIX)[1].split(" ");

            const vertex_indices: vec3 = [0, 0, 0];
            let i = 0;
            for (const vertex of vertices) {
                const [v] = vertex.split("/").map(Number);

                vertex_indices[i] = v - OBJ_INDEX_OFFSET;

                i++;
            }

            objData.faces.push({ vertex_indices });
        }
    }

    return objData;
}
