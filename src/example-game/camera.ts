import { degreesToRadians, Vector3 } from "../math";

export class Camera {
    public position: Vector3;
    public yaw: number;
    public pitch: number;

    public target: Vector3;
    public distance: number;

    public fov: number;
    public zNear: number;
    public zFar: number;

    public constructor(
        position: Vector3 = [0, 0, 0],
        fov: number = degreesToRadians(60),
        target: Vector3 =  [0, 0, 0],
        distance: number =  0,
        zNear: number = 0.1,
        zFar: number = 100,
        yaw: number = 0,
        pitch: number = 0,
    ) {
        this.position = position;
        this.fov = fov;
        this.target = target;
        this.distance = distance;
        this.zNear = zNear;
        this.zFar = zFar;
        this.yaw = yaw;
        this.pitch = pitch;
    }

    public update(target: Vector3): void {
        this.target = target;
    }
}
