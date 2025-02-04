import { GameConstants, ObjectCategory, ZIndexes } from "../../../../common/src/constants";
import { Numeric } from "../../../../common/src/utils/math";
import { type ObjectsNetData } from "../../../../common/src/utils/objectsSerializations";
import { type Game } from "../game";
import { SuroiSprite, toPixiCoords } from "../utils/pixi";
import { GameObject } from "./gameObject";

export class SyncedParticle extends GameObject<ObjectCategory.SyncedParticle> {
    readonly type = ObjectCategory.SyncedParticle;

    readonly image = new SuroiSprite();

    private _alpha = 1;

    private _oldScale?: number;
    private _lastScaleChange?: number;
    private _scaleManuallySet = false;
    private _scale = 0;
    get scale(): number { return this._scale; }
    set scale(scale: number) {
        if (this._scaleManuallySet) {
            this._oldScale = this._scale;
        }
        this._scaleManuallySet = true;

        this._lastScaleChange = Date.now();
        this._scale = scale;
    }

    updateContainerScale(): void {
        if (
            this._oldScale === undefined ||
            this._lastScaleChange === undefined ||
            this.container.scale === undefined
        ) return;

        this.container.scale.set(Numeric.lerp(
            this._oldScale,
            this._scale,
            Math.min(((Date.now() - this._lastScaleChange) / GameConstants.msPerTick), 1)
        ));
    }

    constructor(game: Game, id: number, data: ObjectsNetData[ObjectCategory.SyncedParticle]) {
        super(game, id);

        this.container.addChild(this.image);
        this.updateFromData(data, true);
    }

    override updateFromData(data: ObjectsNetData[ObjectCategory.SyncedParticle], isNew = false): void {
        const full = data.full;
        if (full) {
            const { variant, definition } = full;

            this.image.setFrame(`${definition.frame ?? definition.idString}${variant !== undefined ? `_${variant}` : ""}`);
            if (definition.tint) this.image.tint = definition.tint;
            this.container.zIndex = definition.zIndex ?? ZIndexes.ObstaclesLayer1;
        }

        this.position = data.position;
        this.rotation = data.rotation;
        this._scale = data.scale ?? this._scale;
        this.container.alpha = this._alpha = data.alpha ?? this._alpha;

        if (!this.game.console.getBuiltInCVar("cv_movement_smoothing") || isNew) {
            this.container.position = toPixiCoords(this.position);
            this.container.rotation = this.rotation;
            this.container.scale.set(this._scale);
        }
    }

    override destroy(): void {
        super.destroy();
        this.image.destroy();
    }
}
