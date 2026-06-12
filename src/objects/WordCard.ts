import Phaser from 'phaser';
import { cardScheme } from '../data/compounds';

export const CARD_W = 200;
export const CARD_H = 268;
const R = 22;
const HIT_PAD = 30; // extra tap area beyond visual card edges
const IMG_H = CARD_H * 0.56;
const WORD_H = CARD_H - IMG_H;

export class WordCard extends Phaser.GameObjects.Container {
  readonly word: string;
  private gfx: Phaser.GameObjects.Graphics;
  private glowGfx: Phaser.GameObjects.Graphics;
  private bg: number;
  private ac: number;
  private imgMode: boolean;
  baseX: number;
  baseY: number;
  public inZone = false;
  public selected = false;
  private floatTween!: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    word: string, icon: string,
    draggable = true,
    bgImageKey?: string,
  ) {
    super(scene, x, y);
    this.word = word;
    this.baseX = x;
    this.baseY = y;

    const scheme = cardScheme(word);
    this.bg = scheme.bg;
    this.ac = scheme.ac;
    this.imgMode = !!(bgImageKey && scene.textures.exists(bgImageKey));

    this.glowGfx = scene.add.graphics();
    this.gfx     = scene.add.graphics();

    if (this.imgMode) {
      // ── Image-backed card — image contains all content, no overlay ─
      const bgImg = scene.add.image(0, 2, bgImageKey!).setDisplaySize(CARD_W, CARD_H);
      this.add([this.glowGfx, bgImg]);
    } else {
      // ── Programmatic card ─────────────────────────────────
      const iconText = scene.add.text(0, -CARD_H / 2 + IMG_H * 0.5, icon, {
        fontSize: '72px',
      }).setOrigin(0.5, 0.5);

      const wordText = scene.add.text(0, -CARD_H / 2 + IMG_H + WORD_H * 0.42, word.toUpperCase(), {
        fontFamily: 'Baloo 2',
        fontSize: '28px',
        color: Phaser.Display.Color.IntegerToColor(this.ac).rgba,
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);

      this.add([this.glowGfx, this.gfx, iconText, wordText]);
    }

    scene.add.existing(this as unknown as Phaser.GameObjects.GameObject);
    this.setDepth(10);
    this.setSize(CARD_W + HIT_PAD * 2, CARD_H + HIT_PAD * 2);

    this.drawCard();
    if (draggable) {
      this.setupDrag(scene);
    } else {
      this.setupTap();
    }
    this.startFloat();
  }

  select() {
    this.selected = true;
    this.drawCard();
    this.scene.tweens.add({ targets: this, scaleX: 1.08, scaleY: 1.08, duration: 120, ease: 'Back.easeOut' });
  }

  deselect() {
    this.selected = false;
    this.drawCard();
    this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 120, ease: 'Back.easeIn' });
  }

  private setupTap() {
    this.setInteractive(
      new Phaser.Geom.Rectangle(-CARD_W / 2 - HIT_PAD, -CARD_H / 2 - HIT_PAD, CARD_W + HIT_PAD * 2, CARD_H + HIT_PAD * 2),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerdown', () => this.emit('cardtap', this));
  }

  private drawCard(dragging = false) {
    const g   = this.gfx;
    const gg  = this.glowGfx;
    g.clear();
    gg.clear();

    // No glow or border on selection/drag — size change only (via scale tween)
    if (!this.selected && !dragging && !this.imgMode) {
      gg.fillStyle(this.ac, 0.22);
      gg.fillRoundedRect(-CARD_W / 2 - 10, -CARD_H / 2 - 10, CARD_W + 20, CARD_H + 20, R + 6);
    }

    if (this.imgMode) return; // image card body handled by Phaser Image object

    // ── Programmatic card body ────────────────────────────────
    // Drop shadow
    g.fillStyle(0x000000, 0.28);
    g.fillRoundedRect(-CARD_W / 2 + 6, -CARD_H / 2 + 12, CARD_W, CARD_H, R);

    // Card body
    g.fillStyle(this.bg, 1);
    g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, R);

    // Image area
    const imgC = Phaser.Display.Color.IntegerToColor(this.bg);
    imgC.darken(12);
    g.fillStyle(imgC.color, 1);
    g.fillRoundedRect(
      -CARD_W / 2 + 8, -CARD_H / 2 + 8,
      CARD_W - 16, IMG_H - 8,
      { tl: R - 4, tr: R - 4, bl: 0, br: 0 },
    );

    g.fillStyle(0x000000, 0.07);
    g.fillCircle(0, -CARD_H / 2 + IMG_H * 0.5, 68);

    g.fillStyle(0xFFFFFF, 0.28);
    g.fillRoundedRect(-CARD_W / 2 + 8, -CARD_H / 2 + 8, CARD_W - 16, 22, R - 4);

    const divY = -CARD_H / 2 + IMG_H;
    g.lineStyle(1.5, this.ac, 0.3);
    g.lineBetween(-CARD_W / 2 + 20, divY, CARD_W / 2 - 20, divY);

    g.fillStyle(this.ac, 0.06);
    g.fillRoundedRect(
      -CARD_W / 2 + 8, divY,
      CARD_W - 16, WORD_H - 8,
      { tl: 0, tr: 0, bl: R - 4, br: R - 4 },
    );

    g.lineStyle(dragging ? 3.5 : 2.5, this.ac, dragging ? 1 : 0.7);
    g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, R);
  }

  private setupDrag(scene: Phaser.Scene) {
    this.setInteractive(
      new Phaser.Geom.Rectangle(-CARD_W / 2 - HIT_PAD, -CARD_H / 2 - HIT_PAD, CARD_W + HIT_PAD * 2, CARD_H + HIT_PAD * 2),
      Phaser.Geom.Rectangle.Contains,
    );
    scene.input.setDraggable(this as unknown as Phaser.GameObjects.GameObject);

    this.on('dragstart', () => {
      this.floatTween?.pause();
      this.setDepth(20);
      this.drawCard(true);
      scene.tweens.add({ targets: this, scaleX: 1.06, scaleY: 1.06, duration: 130, ease: 'Back.easeOut' });
    });

    this.on('drag', (_p: unknown, dx: number, dy: number) => {
      this.x = dx;
      this.y = dy;
    });

    this.on('dragend', () => {
      this.setDepth(10);
      this.drawCard(false);
      scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 130, ease: 'Back.easeOut' });
    });
  }

  private startFloat() {
    this.floatTween = this.scene.tweens.add({
      targets: this,
      y: this.baseY - 14,
      duration: 1600 + Math.random() * 700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 900,
    });
  }

  resetPosition() {
    this.floatTween?.resume();
    this.inZone = false;
    this.scene.tweens.add({
      targets: this,
      x: this.baseX, y: this.baseY, scaleX: 1, scaleY: 1,
      duration: 400, ease: 'Back.easeOut',
    });
  }

  snapToZone(tx: number, ty: number) {
    this.floatTween?.pause();
    this.inZone = true;
    this.scene.tweens.add({
      targets: this,
      x: tx, y: ty, scaleX: 0.88, scaleY: 0.88,
      duration: 260, ease: 'Back.easeOut',
    });
  }

  pulseOut() {
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.4, scaleY: 1.4, alpha: 0,
      duration: 350, ease: 'Cubic.easeIn',
      onComplete: () => this.destroy(),
    });
  }

  shakeBack() {
    this.scene.tweens.add({
      targets: this,
      x: { from: this.x - 16, to: this.x + 16 },
      duration: 55, ease: 'Sine.easeInOut',
      yoyo: true, repeat: 4,
      onComplete: () => this.resetPosition(),
    });
  }
}
