import Phaser from 'phaser';
import { WordCard, CARD_W } from '../objects/WordCard';
import { pickRoundPairs, COMPOUND_PAIRS, type CompoundPair } from '../data/compounds';

const ROUNDS = 6;

export class GameScene extends Phaser.Scene {
  // Dynamic screen dimensions — set in create()
  private gw = 0;
  private gh = 0;
  private cx = 0;
  private cy = 0;
  private zoneR = 0;
  private snapOff = 0;

  private leftCards: WordCard[] = [];
  private rightCards: WordCard[] = [];
  private selectedLeft?: WordCard;
  private selectedRight?: WordCard;
  private zoneGfx!: Phaser.GameObjects.Graphics;
  private zoneSpinGfx!: Phaser.GameObjects.Graphics;
  private zoneSpinContainer!: Phaser.GameObjects.Container;
  private zonePulse!: Phaser.Tweens.Tween;
  private queue: CompoundPair[] = [];
  private roundIndex = 0;
  private score = 0;
  private coins = 0;
  private gems = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private gemText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Graphics;
  private hudTrackX = 0;
  private hudTrackY = 0;
  private hudTrackW = 0;
  private hudTrackH = 0;
  private progressRatio = 0;
  private busy = false;
  private burst!: Phaser.GameObjects.Particles.ParticleEmitter;
  private settingsPanel?: Phaser.GameObjects.Container;
  private bgmOn = true;
  private sfxOn = true;

  constructor() { super({ key: 'Game' }); }

  preload() {
    // Actual PNG files
    this.load.image('game_bg',    './images/game_bg.png');
    this.load.image('icon_book',  './images/icon_book.png');
    this.load.image('icon_star',  './images/icon_star.png');
    this.load.image('icon_money', './images/icon_money.png');
    this.load.image('icon_gem',   './images/icon_gemstone.png');
    // Word-specific card images (left)
    ['base','book','butter','cake','cup','door','eye','fire','foot','hand','key','light','moon','news','note','pan','play','rain','sea','snow','star','sun','tea','tooth','water','week']
      .forEach(w => this.load.image(`card_left_${w}`, `./images/card_left_${w}.png`));
    // Word-specific card images (right)
    this.load.image('card_right_cake', './images/card_right_cake.png');

    // Figma SVG assets — scale:2 rasterizes at 2× viewBox size for crisp display at any screen size
    this.load.svg('btn_back_shadow', './images/btn_back_shadow.svg', { scale: 2 });
    this.load.svg('btn_back_main',   './images/btn_back_main.svg',   { scale: 2 });
    this.load.svg('hud_bar_main',    './images/hud_bar_main.svg',    { scale: 2 });
    this.load.svg('hud_bar_pill',    './images/hud_bar_pill.svg',    { scale: 2 });
    this.load.svg('badge_shadow',    './images/badge_shadow.svg',    { scale: 2 });
    this.load.svg('badge_star_main', './images/badge_star_main.svg', { scale: 2 });
    this.load.svg('badge_coin_main', './images/badge_coin_main.svg', { scale: 2 });
    this.load.svg('btn_plus',        './images/btn_plus.svg',        { scale: 2 });
    this.load.svg('btn_setting',     './images/btn_setting.svg',     { scale: 2 });
    this.load.svg('btn_replay_bg',   './images/btn_replay_bg.svg',   { scale: 2 });
    this.load.svg('nav_home_shadow', './images/nav_home_shadow.svg', { scale: 2 });
    this.load.svg('nav_home_main',   './images/nav_home_main.svg',   { scale: 2 });
    this.load.svg('nav_home_top',    './images/nav_home_top.svg',    { scale: 2 });
    this.load.svg('nav_green_shadow','./images/nav_green_shadow.svg',{ scale: 2 });
    this.load.svg('nav_green_main',  './images/nav_green_main.svg',  { scale: 2 });
    this.load.svg('nav_green_top',   './images/nav_green_top.svg',   { scale: 2 });
    this.load.svg('nav_hint_shadow', './images/nav_hint_shadow.svg', { scale: 2 });
    this.load.svg('nav_hint_main',   './images/nav_hint_main.svg',   { scale: 2 });
    this.load.svg('nav_hint_top',    './images/nav_hint_top.svg',    { scale: 2 });
    this.load.svg('icon_replay',     './images/icon_replay.svg',     { scale: 4 });
    this.load.svg('icon_mic',        './images/icon_mic.svg',        { scale: 4 });
    this.load.svg('icon_hint',       './images/icon_hint.svg',       { scale: 4 });
    this.load.svg('icon_home',       './images/icon_home.svg',       { scale: 4 });
  }

  create() {
    // Compute dynamic dimensions once at scene start
    this.gw = this.scale.width;
    this.gh = this.scale.height;
    this.cx = Math.round(this.gw / 2);
    this.cy = Math.round(this.gh * 0.44);
    this.zoneR   = Math.round(Math.min(this.gw, this.gh) * 0.115);
    this.snapOff = Math.round(this.zoneR * 0.65);

    this.queue = pickRoundPairs(ROUNDS);
    this.roundIndex = 0;
    this.score = 0;
    this.coins = 0;
    this.gems  = 0;
    this.busy = false;

    // Pointer cursor on hover for all interactive objects
    this.input.on('gameobjectover', () => { this.game.canvas.style.cursor = 'pointer'; });
    this.input.on('gameobjectout',  () => { this.game.canvas.style.cursor = 'default'; });

    this.buildStageBackground();
    this.buildParticleBurst();
    this.buildHUD();
    this.buildGravityZone();
    this.buildBottomNav();
    this.setupDrag();
    this.startRound();
  }

  update() {
    if (this.zoneSpinContainer?.active) {
      this.zoneSpinContainer.rotation += 0.012;
    }
  }

  // ── Stage background ─────────────────────────────────────────────

  private buildStageBackground() {
    const { gw: GW, gh: GH } = this;

    if (this.textures.exists('game_bg')) {
      // Scale image to cover full screen (object-fit: cover)
      const img = this.add.image(GW / 2, GH / 2, 'game_bg').setDepth(0);
      const tex = this.textures.get('game_bg').getSourceImage();
      const scaleX = GW / tex.width;
      const scaleY = GH / tex.height;
      img.setScale(Math.max(scaleX, scaleY));
    } else {
      // Fallback gradient if image failed to load
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x05051A, 0x05051A, 0x080820, 0x080820, 1);
      bg.fillRect(0, 0, GW, GH);
    }
  }

  // ── Particle burst ────────────────────────────────────────────────

  private buildParticleBurst() {
    const pt = this.make.graphics({ x: 0, y: 0 }, false);
    pt.fillStyle(0xffffff, 1);
    pt.fillCircle(6, 6, 6);
    pt.generateTexture('pDot', 12, 12);
    pt.destroy();

    this.burst = this.add.particles(this.cx, this.cy, 'pDot', {
      speed: { min: 140, max: 440 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 550, max: 900 },
      quantity: 0,
      tint: [0xFFD700, 0xFF6B9D, 0x74CFFF, 0xFF8C00, 0xAAFF88, 0xFFFFFF],
      emitting: false,
    }).setDepth(60);
  }

  // ── HUD ──────────────────────────────────────────────────────────
  // All positions/sizes derived from Figma design at 1280×720

  private buildHUD() {
    const { gw: GW, gh: GH } = this;
    const sx = GW / 1280;
    const sy = GH / 720;
    const s  = Math.min(sx, sy);

    const p  = (fx: number) => Math.round(fx * sx);   // x pixel
    const q  = (fy: number) => Math.round(fy * sy);   // y pixel
    const sz = (f: number)  => Math.round(f  * s);    // uniform size

    // ── Back button  (Figma: left:14, top:13, size:62) ───────────
    const bSz = sz(62);
    this.add.image(p(14) + bSz / 2, q(13) + bSz / 2 + q(4), 'btn_back_shadow').setDisplaySize(bSz, bSz).setDepth(50);
    this.add.image(p(14) + bSz / 2, q(13) + bSz / 2,         'btn_back_main'  ).setDisplaySize(bSz, bSz).setDepth(51);

    // Book icon  (Figma: left:98, top:16, size:46×56)
    this.add.image(p(98 + 23), q(16 + 28), 'icon_book').setDisplaySize(sz(46), sz(56)).setDepth(53);

    // Back button hit zone (invisible)
    const hitG = this.add.graphics().setDepth(55).setAlpha(0.001);
    hitG.fillRect(p(14), q(13), bSz, bSz);
    hitG.setInteractive(new Phaser.Geom.Rectangle(p(14), q(13), bSz, bSz), Phaser.Geom.Rectangle.Contains);
    hitG.on('pointerdown', () => {
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
    });

    // ── Progress bar pill  (Figma: left:88, top:13, size:241×58) ─
    const pillW = p(241), pillH = q(58);
    this.add.image(p(88) + pillW / 2, q(13) + pillH / 2 + q(4), 'hud_bar_main').setDisplaySize(pillW, pillH).setDepth(50);
    this.add.image(p(88) + pillW / 2, q(13) + pillH / 2,         'hud_bar_pill').setDisplaySize(pillW, pillH).setDepth(51);

    // Track inner  (Figma: left:151, top:40, size:160×24, r:12)
    const tX = p(151), tY = q(40), tW = p(160), tH = q(24);
    const trackG = this.add.graphics().setDepth(52);
    trackG.fillStyle(0x382a65, 1);
    trackG.fillRoundedRect(tX, tY, tW, tH, sz(12));

    this.hudTrackX = p(153); this.hudTrackY = q(42);
    this.hudTrackW = p(156); this.hudTrackH = q(20);
    this.progressFill = this.add.graphics().setDepth(53);
    // bar starts empty — filled on correct answer in onRoundWin

    // "Compound Book" label  (Figma: left:164, top:19)
    this.add.text(p(164), q(19), 'Compound Book', {
      fontFamily: '"Inter", "Baloo 2"', fontSize: `${sz(16)}px`,
      color: '#FFFFFF', fontStyle: 'bold',
    }).setDepth(52);

    // Round progress text (centered on track)
    this.roundText = this.add.text(tX + tW / 2, tY + tH / 2, `1 / ${ROUNDS}`, {
      fontFamily: 'Baloo 2', fontSize: `${sz(11)}px`, color: 'rgba(255,255,255,0.7)',
    }).setOrigin(0.5).setDepth(54);

    // ── Settings button  (Figma: left:1204, top:13, size:62) ─────
    const sSz = sz(62);
    const settingImg = this.add.image(p(1204) + sSz / 2, q(13) + sSz / 2, 'btn_setting').setDisplaySize(sSz, sSz).setDepth(51);
    const settingHit = this.add.graphics().setDepth(55).setAlpha(0.001);
    settingHit.fillRect(p(1204), q(13), sSz, sSz);
    settingHit.setInteractive(new Phaser.Geom.Rectangle(p(1204), q(13), sSz, sSz), Phaser.Geom.Rectangle.Contains);
    settingHit.on('pointerdown', () => {
      this.tweens.add({ targets: settingImg, scaleX: 0.88, scaleY: 0.88, duration: 80, yoyo: true, ease: 'Back.easeIn' });
      this.showSettings();
    });

    // ── Currency badges ───────────────────────────────────────────
    // Each badge: left, badge-bg key, icon key, icon center X (Figma), numRight X, plus center X
    type BadgeCfg = { bL: number; bgKey: string; iconKey: string; iCX: number; numRX: number; plusCX: number; kind: 'score' | 'coin' | 'gem' };
    const badges: BadgeCfg[] = [
      { bL: 688,  bgKey: 'badge_star_main', iconKey: 'icon_star',  iCX: 724.5, numRX: 795,  plusCX: 825,  kind: 'score' },
      { bL: 860,  bgKey: 'badge_coin_main', iconKey: 'icon_money', iCX: 893,   numRX: 967,  plusCX: 997,  kind: 'coin'  },
      { bL: 1032, bgKey: 'badge_coin_main', iconKey: 'icon_gem',   iCX: 1067.5,numRX: 1139, plusCX: 1169, kind: 'gem'   },
    ];
    const bW = p(152), bH = q(58);
    const ibH = q(40);

    badges.forEach(cfg => {
      const bx = p(cfg.bL), by = q(13);
      this.add.image(bx + bW / 2, by + bH / 2 + q(4), 'badge_shadow').setDisplaySize(bW, bH).setDepth(50);
      this.add.image(bx + bW / 2, by + bH / 2,         cfg.bgKey    ).setDisplaySize(bW, bH).setDepth(51);
      const ibL = bx + p(27), ibT = by + q(9), ibW = p(110);
      const ibG = this.add.graphics().setDepth(52);
      ibG.fillStyle(0x426295, 1);
      ibG.fillRoundedRect(ibL, ibT, ibW, ibH, sz(12));
      const iconSz = sz(40);
      this.add.image(bx + sz(10) + iconSz / 2, ibT + ibH / 2, cfg.iconKey).setDisplaySize(iconSz, iconSz).setDepth(53);
      const numTxt = this.add.text(p(cfg.numRX), q(29), '0', {
        fontFamily: '"Inter", "Baloo 2"', fontSize: `${sz(24)}px`,
        color: '#FFFFFF', fontStyle: 'bold',
      }).setOrigin(1, 0).setDepth(53);
      if (cfg.kind === 'score') this.scoreText = numTxt;
      if (cfg.kind === 'coin')  this.coinText  = numTxt;
      if (cfg.kind === 'gem')   this.gemText   = numTxt;
      this.add.image(p(cfg.plusCX), q(43), 'btn_plus').setDisplaySize(sz(36), sz(36)).setDepth(53);
    });
  }

  private drawProgress() {
    const fillW = Math.round(this.hudTrackW * this.progressRatio);
    this.progressFill.clear();
    if (fillW < 4) return;
    // Clamp radius so it never exceeds half the fill width
    const r = Math.min(this.hudTrackH / 2, fillW / 2);
    this.progressFill.fillGradientStyle(0xd899df, 0xd899df, 0x8747d1, 0x8747d1, 1);
    this.progressFill.fillRoundedRect(this.hudTrackX, this.hudTrackY, fillW, this.hudTrackH, r);
  }

  private animateProgressTo(targetRatio: number) {
    const from = { r: this.progressRatio };
    this.tweens.add({
      targets: from,
      r: Math.min(targetRatio, 1),
      duration: 500,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.progressRatio = from.r;
        this.drawProgress();
      },
      onComplete: () => {
        this.progressRatio = Math.min(targetRatio, 1);
        this.drawProgress();
      },
    });
  }

  // ── Settings overlay ─────────────────────────────────────────────

  private showSettings() {
    if (this.settingsPanel) { this.settingsPanel.setVisible(true); return; }

    const { gw: GW, gh: GH } = this;
    const s = Math.min(GW / 1280, GH / 720);
    const sz = (f: number) => Math.round(f * s);

    const panelW = sz(480), panelH = sz(320);
    const panelX = GW / 2, panelY = GH / 2;

    const container = this.add.container(panelX, panelY).setDepth(200);

    // Dark backdrop
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.65);
    backdrop.fillRect(-GW / 2, -GH / 2, GW, GH);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(-GW / 2, -GH / 2, GW, GH), Phaser.Geom.Rectangle.Contains);
    container.add(backdrop);

    // Panel background
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1040, 1);
    panel.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, sz(24));
    panel.lineStyle(sz(2), 0x7b63b7, 0.6);
    panel.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, sz(24));
    container.add(panel);

    // Title
    const title = this.add.text(0, -panelH / 2 + sz(40), '⚙️  설정', {
      fontFamily: '"Noto Sans KR", "Baloo 2"', fontSize: `${sz(28)}px`,
      color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(title);

    // Divider
    const div = this.add.graphics();
    div.lineStyle(1, 0x7b63b7, 0.4);
    div.lineBetween(-panelW / 2 + sz(24), -panelH / 2 + sz(72), panelW / 2 - sz(24), -panelH / 2 + sz(72));
    container.add(div);

    // Toggle helper
    const makeToggle = (labelText: string, rowY: number, isOn: () => boolean, toggle: () => void) => {
      const label = this.add.text(-panelW / 2 + sz(40), rowY, labelText, {
        fontFamily: '"Noto Sans KR", "Baloo 2"', fontSize: `${sz(22)}px`, color: '#CCBBFF',
      }).setOrigin(0, 0.5);

      const tW = sz(88), tH = sz(44), tX = panelW / 2 - sz(56), tY = rowY;
      const trackBg = this.add.graphics();
      const knob = this.add.text(0, 0, '', { fontSize: `${sz(26)}px` }).setOrigin(0.5);

      const refresh = () => {
        const on = isOn();
        trackBg.clear();
        trackBg.fillStyle(on ? 0x7b63b7 : 0x444060, 1);
        trackBg.fillRoundedRect(tX - tW / 2, tY - tH / 2, tW, tH, tH / 2);
        knob.setPosition(on ? tX + tW / 4 : tX - tW / 4, tY);
        knob.setText(on ? '🔊' : '🔇');
      };
      refresh();

      const hit = this.add.graphics().setAlpha(0.001);
      hit.fillRect(tX - tW / 2, tY - tH / 2, tW, tH);
      hit.setInteractive(new Phaser.Geom.Rectangle(tX - tW / 2, tY - tH / 2, tW, tH), Phaser.Geom.Rectangle.Contains);
      hit.on('pointerdown', () => { toggle(); refresh(); });

      container.add([label, trackBg, knob, hit]);
    };

    makeToggle('배경음악 (BGM)', -sz(30), () => this.bgmOn, () => { this.bgmOn = !this.bgmOn; });
    makeToggle('효과음 (SFX)',   sz(40),  () => this.sfxOn, () => { this.sfxOn = !this.sfxOn; });

    // Close button
    const closeBtnY = panelH / 2 - sz(44);
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0x5a3fbf, 1);
    closeBg.fillRoundedRect(-sz(72), closeBtnY - sz(22), sz(144), sz(44), sz(12));
    const closeText = this.add.text(0, closeBtnY, '닫기', {
      fontFamily: '"Noto Sans KR", "Baloo 2"', fontSize: `${sz(22)}px`, color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);
    const closeHit = this.add.graphics().setAlpha(0.001);
    closeHit.fillRect(-sz(72), closeBtnY - sz(22), sz(144), sz(44));
    closeHit.setInteractive(new Phaser.Geom.Rectangle(-sz(72), closeBtnY - sz(22), sz(144), sz(44)), Phaser.Geom.Rectangle.Contains);
    closeHit.on('pointerdown', () => container.setVisible(false));
    closeHit.on('pointerover', () => { closeBg.clear(); closeBg.fillStyle(0x7b63b7, 1); closeBg.fillRoundedRect(-sz(72), closeBtnY - sz(22), sz(144), sz(44), sz(12)); });
    closeHit.on('pointerout',  () => { closeBg.clear(); closeBg.fillStyle(0x5a3fbf, 1); closeBg.fillRoundedRect(-sz(72), closeBtnY - sz(22), sz(144), sz(44), sz(12)); });

    container.add([closeBg, closeText, closeHit]);

    // Entrance animation
    container.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });

    this.settingsPanel = container;
  }

  // ── Gravity Zone ─────────────────────────────────────────────────

  private buildGravityZone() {
    const { cx: CX, cy: CY } = this;

    this.zoneGfx = this.add.graphics().setDepth(6);
    this.drawStaticZone();

    // Spinning container holds both ring graphics and text so they rotate together
    this.zoneSpinContainer = this.add.container(CX, CY).setDepth(7);
    this.zoneSpinGfx = this.add.graphics();
    this.zoneSpinContainer.add(this.zoneSpinGfx);
    this.drawSpinRing();

    const zoneFontSize = Math.round(this.zoneR * 1.8);
    const zoneText = this.add.text(0, 0, 'GRAVITY\nZONE', {
      fontFamily: 'Baloo 2', fontSize: `${zoneFontSize}px`, color: '#FFFFFF', fontStyle: 'bold',
      align: 'center',
      shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 8, fill: true },
    }).setOrigin(0.5);
    this.zoneSpinContainer.add(zoneText);

    this.zonePulse = this.tweens.add({
      targets: this.zoneGfx,
      alpha: { from: 0.7, to: 1 },
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 1400, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
    });
  }

  private drawStaticZone() {
    const { cx: CX, cy: CY, zoneR: ZONE_R } = this;
    const g = this.zoneGfx;
    g.clear();

    [ZONE_R + 50, ZONE_R + 28].forEach((r, i) => {
      g.lineStyle(1.5, 0x74C0E8, [0.1, 0.22][i]);
      g.strokeCircle(CX, CY, r);
    });

    g.lineStyle(4, 0x74C0E8, 0.65);
    g.strokeCircle(CX, CY, ZONE_R);

    g.fillStyle(0x74C0E8, 0.07);
    g.fillCircle(CX, CY, ZONE_R);

    for (let a = 0; a < 360; a += 45) {
      const rad = Phaser.Math.DegToRad(a);
      g.lineStyle(1.5, 0x74C0E8, 0.3);
      g.lineBetween(
        CX + Math.cos(rad) * (ZONE_R * 0.4), CY + Math.sin(rad) * (ZONE_R * 0.4),
        CX + Math.cos(rad) * ZONE_R, CY + Math.sin(rad) * ZONE_R,
      );
    }
  }

  private drawSpinRing() {
    const { zoneR: ZONE_R } = this;
    const g = this.zoneSpinGfx;
    g.clear();

    for (let a = 0; a < 360; a += 22.5) {
      const rad = Phaser.Math.DegToRad(a);
      const inner = ZONE_R + 10;
      const outer = ZONE_R + 22;
      g.lineStyle(a % 45 === 0 ? 2.5 : 1, 0x74C0E8, a % 45 === 0 ? 0.7 : 0.3);
      g.lineBetween(
        Math.cos(rad) * inner, Math.sin(rad) * inner,
        Math.cos(rad) * outer, Math.sin(rad) * outer,
      );
    }

    for (let a = 0; a < 360; a += 30) {
      const rad = Phaser.Math.DegToRad(a);
      const r = ZONE_R + 36;
      g.fillStyle(0x74C0E8, 0.25);
      g.fillCircle(Math.cos(rad) * r, Math.sin(rad) * r, 2.5);
    }
  }

  // ── Bottom navigation ─────────────────────────────────────────────
  // Figma: 4 buttons at top:648, each width:162
  // Replay:301  Mic:473  Hint:645  Home:817

  private buildBottomNav() {
    const { gw: GW, gh: GH } = this;
    const sx = GW / 1280;
    const sy = GH / 720;
    const s  = Math.min(sx, sy);

    const p  = (fx: number) => Math.round(fx * sx);
    const q  = (fy: number) => Math.round(fy * sy);
    const sz = (f: number)  => Math.round(f  * s);

    const navY = q(648), navH = q(58), shadowOff = q(4);
    const navCY = navY + Math.round(navH / 2);
    const txtStyle = {
      fontFamily: '"Inter", "Baloo 2"', fontSize: `${sz(24)}px`,
      color: '#FFFFFF', fontStyle: 'bold',
      shadow: { offsetX: 0, offsetY: sz(2), color: 'rgba(0,0,0,0.25)', blur: 2, fill: true },
    };

    const drawLayered = (figX: number, figW: number, shKey: string, mainKey: string, topKey: string) => {
      const x = p(figX), w = p(figW);
      this.add.image(x + w / 2, navCY + shadowOff, shKey  ).setDisplaySize(w, navH).setDepth(40);
      this.add.image(x + w / 2, navCY,             mainKey).setDisplaySize(w, navH).setDepth(41);
      this.add.image(x + w / 2, navCY,             topKey ).setDisplaySize(w, navH).setDepth(42);
    };

    const makeHit = (figX: number, figW: number, cb: () => void) => {
      const x = p(figX), w = p(figW);
      const h = this.add.graphics().setDepth(45).setAlpha(0.001);
      h.fillRect(x, navY, w, navH);
      h.setInteractive(new Phaser.Geom.Rectangle(x, navY, w, navH), Phaser.Geom.Rectangle.Contains);
      h.on('pointerdown', cb);
    };

    const btnPress = (imgs: Phaser.GameObjects.Image[]) => {
      this.tweens.add({ targets: imgs, scaleX: 0.92, scaleY: 0.92, duration: 80, yoyo: true, ease: 'Back.easeIn' });
    };

    // ── Replay  (Figma left:301) — restart scene ─────────────────
    // btn_replay_bg.svg includes all layers in one file (shadow+main+top)
    const replayImgs: Phaser.GameObjects.Image[] = [];
    replayImgs.push(this.add.image(p(301 + 81), navCY, 'btn_replay_bg').setDisplaySize(p(162), q(62)).setDepth(40));
    replayImgs.push(this.add.image(p(325), navCY, 'icon_replay').setDisplaySize(sz(30), sz(30)).setDepth(43));
    this.add.text(p(325) + sz(15) + sz(10), navCY, 'Replay', txtStyle).setOrigin(0, 0.5).setDepth(43);
    makeHit(301, 162, () => {
      btnPress(replayImgs);
      this.time.delayedCall(100, () => {
        this.cameras.main.fadeOut(280, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
      });
    });

    // ── Mic  (Figma left:473) — speech recognition ───────────────
    const micImgs: Phaser.GameObjects.Image[] = [];
    drawLayered(473, 162, 'nav_green_shadow', 'nav_green_main', 'nav_green_top');
    micImgs.push(this.add.image(p(516), navCY, 'icon_mic').setDisplaySize(sz(24), sz(34)).setDepth(43));
    this.add.text(p(516) + sz(12) + sz(10), navCY, 'Mic', txtStyle).setOrigin(0, 0.5).setDepth(43);
    makeHit(473, 162, () => {
      btnPress(micImgs);
      this.startMic();
    });

    // ── Hint  (Figma left:645) — flash cards ─────────────────────
    const hintImgs: Phaser.GameObjects.Image[] = [];
    drawLayered(645, 162, 'nav_hint_shadow', 'nav_hint_main', 'nav_hint_top');
    hintImgs.push(this.add.image(p(684), navCY, 'icon_hint').setDisplaySize(sz(28), sz(34)).setDepth(43));
    this.add.text(p(684) + sz(14) + sz(10), navCY, 'Hint', txtStyle).setOrigin(0, 0.5).setDepth(43);
    makeHit(645, 162, () => {
      btnPress(hintImgs);
      this.showHint();
    });

    // ── Home  (Figma left:817) — reload to intro ─────────────────
    const homeImgs: Phaser.GameObjects.Image[] = [];
    drawLayered(817, 162, 'nav_home_shadow', 'nav_home_main', 'nav_home_top');
    homeImgs.push(this.add.image(p(846), navCY, 'icon_home').setDisplaySize(sz(30), sz(28)).setDepth(43));
    this.add.text(p(846) + sz(15) + sz(10), navCY, 'Home', txtStyle).setOrigin(0, 0.5).setDepth(43);
    makeHit(817, 162, () => {
      btnPress(homeImgs);
      this.time.delayedCall(100, () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => window.location.reload());
      });
    });
  }

  private startMic() {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition
             || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) { this.showToast('이 브라우저는 음성 인식을 지원하지 않아요 😢'); return; }

    const { gw: GW, gh: GH } = this;
    const s = Math.min(GW / 1280, GH / 720);
    const sz = (f: number) => Math.round(f * s);

    // Pulsing ring around mic button center
    const ringX = Math.round((473 + 81) * GW / 1280);
    const ring = this.add.graphics().setDepth(46);
    const ringTween = this.tweens.add({
      targets: ring, alpha: { from: 0.8, to: 0 },
      scaleX: { from: 1, to: 2.2 }, scaleY: { from: 1, to: 2.2 },
      duration: 700, repeat: -1, ease: 'Sine.easeOut',
      onUpdate: () => {
        ring.clear();
        ring.lineStyle(sz(3), 0x44ee88, 1);
        ring.strokeCircle(ringX, Math.round(GH * 677 / 720), sz(36));
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SR as new () => any)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: any) => {
      const word = e.results[0][0].transcript.trim().toLowerCase();
      ringTween.stop(); ring.destroy();
      this.showToast(`"${word}" 들었어요! 🎤`);
    };
    recognition.onerror = () => { ringTween.stop(); ring.destroy(); };
    recognition.onend   = () => { ringTween.stop(); ring.destroy(); };

    recognition.start();
  }

  private showHint() {
    if (this.busy) return;
    [...this.leftCards, ...this.rightCards].forEach(card => {
      if (!card?.active) return;
      this.tweens.add({
        targets: card,
        y: card.y - Math.round(this.gh * 0.04),
        duration: 180, ease: 'Back.easeOut', yoyo: true, repeat: 2,
      });
      const flash = this.add.graphics().setDepth(card.depth + 1);
      flash.lineStyle(Math.round(Math.min(this.gw, this.gh) * 0.006), 0xFFD700, 0.9);
      flash.strokeCircle(card.x, card.y, CARD_W * 0.6 * card.scaleX);
      this.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
    });
    const arrow = this.add.text(this.cx, this.cy - this.zoneR - Math.round(this.gh * 0.06), '👇', {
      fontSize: `${Math.round(Math.min(this.gw, this.gh) * 0.06)}px`,
    }).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets: arrow, y: arrow.y + Math.round(this.gh * 0.03), alpha: 0, duration: 800, ease: 'Sine.easeIn', onComplete: () => arrow.destroy() });
  }

  private showToast(msg: string) {
    const { gw: GW, gh: GH } = this;
    const s = Math.min(GW / 1280, GH / 720);
    const toast = this.add.text(GW / 2, Math.round(GH * 0.82), msg, {
      fontFamily: '"Noto Sans KR", "Baloo 2"', fontSize: `${Math.round(s * 22)}px`,
      color: '#FFFFFF', fontStyle: 'bold',
      backgroundColor: 'rgba(0,0,0,0.65)', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(200).setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, y: toast.y - Math.round(GH * 0.03), duration: 250, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: toast, alpha: 0, delay: 1800, duration: 300, onComplete: () => toast.destroy() }),
    });
  }

  // ── Round management ──────────────────────────────────────────────

  private startRound() {
    const { gw: GW, gh: GH } = this;
    this.busy = false;
    this.selectedLeft = undefined;
    this.selectedRight = undefined;
    this.leftCards = [];
    this.rightCards = [];
    this.roundText.setText(`${this.roundIndex + 1} / ${ROUNDS}`);

    const pair = this.queue[this.roundIndex];

    // Pick 4 distractor pairs (different word1 AND word2 from current)
    const others = COMPOUND_PAIRS.filter(p => p.word1 !== pair.word1 && p.word2 !== pair.word2);
    const distract = [...others].sort(() => Math.random() - 0.5).slice(0, 4);

    const leftData = [
      { word: pair.word1, icon: pair.icon1 },
      { word: distract[0].word1, icon: distract[0].icon1 },
      { word: distract[1].word1, icon: distract[1].icon1 },
    ].sort(() => Math.random() - 0.5);

    const rightData = [
      { word: pair.word2, icon: pair.icon2 },
      { word: distract[2].word2, icon: distract[2].icon2 },
      { word: distract[3].word2, icon: distract[3].icon2 },
    ].sort(() => Math.random() - 0.5);

    const CARD_SCALE = 0.972;
    // Figma-matched staggered positions (Figma canvas: 1280×720)
    // Values are card CENTER coordinates
    const pf = (fx: number) => Math.round(fx * GW / 1280);
    const qf = (fy: number) => Math.round(fy * GH / 720);

    const leftPos  = [{ x: 209, y: 198 }, { x: 359, y: 334 }, { x: 153, y: 449 }];
    const rightPos = [{ x: 950, y: 240 }, { x: 1020, y: 435 }, { x: 1139, y: 190 }];
    const leftAngle  = [-8, -4, -12];
    const rightAngle = [10,  4,   8];

    const makeCard = (figX: number, figY: number, angle: number, slotIdx: number, word: string, icon: string, side: 'left' | 'right') => {
      const targetX  = pf(figX);
      const targetY  = qf(figY);
      const startX   = side === 'left' ? -CARD_W : GW + CARD_W;
      const leftKey  = `card_left_${word}`;
      const rightKey = `card_right_${word}`;
      const bgKey    = side === 'left'
        ? (this.textures.exists(leftKey)  ? leftKey  : undefined)
        : (this.textures.exists(rightKey) ? rightKey : undefined);
      const card = new WordCard(this, startX, targetY, word, icon, true, bgKey);
      card.setScale(CARD_SCALE);
      card.setAngle(angle);
      card.baseX = targetX;
      this.tweens.add({ targets: card, x: targetX, duration: 480 + slotIdx * 40, ease: 'Back.easeOut', delay: slotIdx * 80 });
      return card;
    };

    leftData.forEach((d, i) => this.leftCards.push(
      makeCard(leftPos[i].x, leftPos[i].y, leftAngle[i], i, d.word, d.icon, 'left')
    ));
    rightData.forEach((d, i) => this.rightCards.push(
      makeCard(rightPos[i].x, rightPos[i].y, rightAngle[i], i, d.word, d.icon, 'right')
    ));

    this.showBanner(`${pair.word1.toUpperCase()} + ${pair.word2.toUpperCase()} = ?`);
  }

  // ── Drag event wiring ─────────────────────────────────────────────

  private setupDrag() {
    this.input.on('dragend', (_p: unknown, obj: Phaser.GameObjects.GameObject) => {
      if (this.busy || !(obj instanceof WordCard)) return;
      const card = obj as WordCard;
      const isLeft  = this.leftCards.includes(card);
      const isRight = this.rightCards.includes(card);
      if (!isLeft && !isRight) return;

      const dist = Phaser.Math.Distance.Between(card.x, card.y, this.cx, this.cy);

      if (dist < this.zoneR + 30) {
        if (isLeft) {
          // kick out previous occupant on left slot
          if (this.selectedLeft && this.selectedLeft !== card) this.selectedLeft.shakeBack();
          this.selectedLeft = card;
          card.snapToZone(this.cx - this.snapOff, this.cy);
        } else {
          if (this.selectedRight && this.selectedRight !== card) this.selectedRight.shakeBack();
          this.selectedRight = card;
          card.snapToZone(this.cx + this.snapOff, this.cy);
        }

        if (this.selectedLeft?.inZone && this.selectedRight?.inZone) {
          this.time.delayedCall(260, () => this.checkMatch());
        }
      } else if (!card.inZone) {
        card.resetPosition();
      }
    });
  }

  private checkMatch() {
    const pair = this.queue[this.roundIndex];
    if (this.selectedLeft!.word === pair.word1 && this.selectedRight!.word === pair.word2) {
      this.time.delayedCall(160, () => this.triggerCollision());
    } else {
      this.onWrongMatch();
    }
  }

  private onWrongMatch() {
    this.cameras.main.flash(180, 255, 60, 60, false);
    this.cameras.main.shake(260, 0.009);

    const wrongText = this.add.text(this.cx, this.cy, '✗', {
      fontFamily: 'Baloo 2', fontSize: '80px', color: '#FF4444', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(70).setAlpha(0);
    this.tweens.add({
      targets: wrongText, alpha: 1, scaleX: 1.4, scaleY: 1.4, duration: 200,
      onComplete: () => this.tweens.add({ targets: wrongText, alpha: 0, duration: 300, delay: 200, onComplete: () => wrongText.destroy() }),
    });

    // shake both cards back to their column positions
    this.selectedLeft?.shakeBack();
    this.selectedRight?.shakeBack();
    this.selectedLeft  = undefined;
    this.selectedRight = undefined;
  }

  // ── Collision sequence ────────────────────────────────────────────

  private triggerCollision() {
    const { cx: CX, cy: CY } = this;
    this.busy = true;

    // Fade out all non-selected cards
    [...this.leftCards, ...this.rightCards].forEach(c => {
      if (c !== this.selectedLeft && c !== this.selectedRight) {
        this.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => c.destroy() });
      }
    });

    this.tweens.add({ targets: this.selectedLeft,  x: CX - 18, y: CY, duration: 300, ease: 'Cubic.easeIn' });
    this.tweens.add({
      targets: this.selectedRight, x: CX + 18, y: CY, duration: 300, ease: 'Cubic.easeIn',
      onComplete: () => this.playImpact(),
    });
  }

  private playImpact() {
    const { cx: CX, cy: CY } = this;
    const pair = this.queue[this.roundIndex];

    this.cameras.main.flash(200, 255, 255, 255, false);
    this.cameras.main.shake(280, 0.012);

    const wave = this.add.graphics().setDepth(55);
    this.tweens.add({
      targets: { r: 0, a: 1 },
      r: Math.max(this.gw, this.gh) * 0.29, a: 0,
      duration: 500, ease: 'Cubic.easeOut',
      onUpdate: (tw) => {
        const v = tw.targets[0] as { r: number; a: number };
        wave.clear();
        wave.lineStyle(4, 0xFFFFFF, v.a * 0.8);
        wave.strokeCircle(CX, CY, v.r);
        wave.lineStyle(2, 0x74C0E8, v.a * 0.4);
        wave.strokeCircle(CX, CY, v.r * 0.7);
      },
      onComplete: () => wave.destroy(),
    });

    const bolt = this.add.graphics().setDepth(56);
    bolt.lineStyle(3, 0xFFFFFF, 0.9);
    bolt.lineBetween(CX - this.gw * 0.11, CY, CX + this.gw * 0.11, CY);
    this.time.delayedCall(120, () => bolt.destroy());

    this.burst.setPosition(CX, CY);
    this.burst.explode(80);
    this.time.delayedCall(120, () => {
      this.burst.setPosition(CX - 60, CY); this.burst.explode(30);
      this.burst.setPosition(CX + 60, CY); this.burst.explode(30);
    });

    this.selectedLeft?.pulseOut();
    this.selectedRight?.pulseOut();

    this.time.delayedCall(420, () => {
      this.showResultCard(pair);
    });
  }

  // ── Result card ───────────────────────────────────────────────────

  private showResultCard(pair: CompoundPair) {
    const { cx: CX, cy: CY } = this;
    const rx = CX + 20;
    const ry = CY - 10;

    const cont = this.add.container(rx, ry - 80)
      .setDepth(52).setAlpha(0).setScale(0.6);

    const CRW = Math.round(this.gw * 0.234);
    const CRH = Math.round(CRW * 1.29);
    const CR = 22;

    const g = this.add.graphics();

    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(-CRW / 2 + 6, -CRH / 2 + 10, CRW, CRH, CR);

    g.fillGradientStyle(0x1A0D00, 0x1A0D00, 0x2A1800, 0x2A1800, 1);
    g.fillRoundedRect(-CRW / 2, -CRH / 2, CRW, CRH, CR);

    g.lineStyle(4, 0xFFD700, 0.95);
    g.strokeRoundedRect(-CRW / 2, -CRH / 2, CRW, CRH, CR);
    g.lineStyle(1.5, 0xFFD700, 0.3);
    g.strokeRoundedRect(-CRW / 2 + 8, -CRH / 2 + 8, CRW - 16, CRH - 16, CR - 4);

    g.fillStyle(0xFFD700, 0.08);
    g.fillRoundedRect(-CRW / 2 + 10, -CRH / 2 + 10, CRW - 20, CRH * 0.58,
      { tl: CR - 4, tr: CR - 4, bl: 0, br: 0 });

    g.fillStyle(0xFF4400, 1);
    g.fillRoundedRect(-CRW / 2 + 10, -CRH / 2 + 10, 64, 28, 10);

    const newBadge = this.add.text(-CRW / 2 + 42, -CRH / 2 + 24, 'NEW!', {
      fontFamily: 'Baloo 2', fontSize: '16px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);

    const iconFs = Math.round(CRH * 0.27);
    const iconText = this.add.text(0, -CRH / 2 + CRH * 0.31, pair.iconResult, {
      fontSize: `${iconFs}px`,
    }).setOrigin(0.5);

    g.lineStyle(1.5, 0xFFD700, 0.3);
    g.lineBetween(-CRW / 2 + 20, -CRH / 2 + CRH * 0.6, CRW / 2 - 20, -CRH / 2 + CRH * 0.6);

    const wordFs = Math.round(CRH * 0.115);
    const wordText = this.add.text(0, -CRH / 2 + CRH * 0.73, pair.result.toUpperCase(), {
      fontFamily: 'Baloo 2', fontSize: `${wordFs}px`, color: '#FFD700', fontStyle: 'bold',
      shadow: { offsetX: 2, offsetY: 3, color: '#000000', blur: 8, fill: true },
    }).setOrigin(0.5);

    const pronText = this.add.text(0, -CRH / 2 + CRH * 0.87, pair.pron, {
      fontFamily: 'Noto Sans KR', fontSize: `${Math.round(CRH * 0.06)}px`, color: '#AA9966',
    }).setOrigin(0.5);

    cont.add([g, newBadge, iconText, wordText, pronText]);

    this.tweens.add({
      targets: cont,
      y: ry, alpha: 1, scaleX: 1, scaleY: 1,
      duration: 560, ease: 'Back.easeOut',
      onComplete: () => {
        this.burst.setPosition(rx, ry);
        this.burst.explode(40);
        this.onRoundWin(pair, cont);
      },
    });

    this.tweens.add({
      targets: cont,
      scaleX: 1.03, scaleY: 1.03,
      duration: 900, ease: 'Sine.easeInOut',
      yoyo: true, repeat: -1, delay: 600,
    });
  }

  private bumpBadge(txt: Phaser.GameObjects.Text) {
    this.tweens.add({ targets: txt, scaleX: 1.5, scaleY: 1.5, duration: 160, ease: 'Back.easeOut', yoyo: true });
  }

  private onRoundWin(pair: CompoundPair, resultCont: Phaser.GameObjects.Container) {
    const { cx: CX, cy: CY } = this;
    this.animateProgressTo((this.roundIndex + 1) / ROUNDS);

    this.score += 10;
    this.coins += 15;
    this.gems  += 3;
    this.scoreText.setText(`${this.score}`);
    this.coinText.setText(`${this.coins}`);
    this.gemText.setText(`${this.gems}`);
    this.bumpBadge(this.scoreText);
    this.time.delayedCall(80,  () => this.bumpBadge(this.coinText));
    this.time.delayedCall(160, () => this.bumpBadge(this.gemText));

    const reward = this.add.text(CX + 80, CY - 60, '+10 ⭐', {
      fontFamily: 'Baloo 2', fontSize: '28px', color: '#FFD700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(60).setAlpha(0);
    this.tweens.add({
      targets: reward, y: CY - 130, alpha: 1,
      duration: 500, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: reward, alpha: 0, duration: 400, delay: 400, onComplete: () => reward.destroy() });
      },
    });

    this.showBanner(`✨ ${pair.result.toUpperCase()}!`);

    this.time.delayedCall(2400, () => {
      this.tweens.add({
        targets: resultCont, alpha: 0, scaleX: 0.7, y: '-=50',
        duration: 320, ease: 'Cubic.easeIn',
        onComplete: () => {
          resultCont.destroy();
          this.roundIndex++;
          this.zoneGfx.alpha = 1;
          this.zonePulse.resume();
          if (this.roundIndex >= ROUNDS) this.showFinale();
          else this.startRound();
        },
      });
    });
  }

  // ── Finale ────────────────────────────────────────────────────────

  private showFinale() {
    const { gw: GW, gh: GH, cx: CX, cy: CY } = this;

    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 180, () => {
        this.burst.setPosition(Math.random() * GW, Math.random() * GH * 0.6);
        this.burst.explode(50);
      });
    }

    const dim = this.add.graphics().setDepth(70).setAlpha(0);
    dim.fillStyle(0x000000, 0.7);
    dim.fillRect(0, 0, GW, GH);
    this.tweens.add({ targets: dim, alpha: 1, duration: 500 });

    const pw = Math.round(GW * 0.58);
    const ph = Math.round(GH * 0.57);
    const panel = this.add.graphics().setDepth(71);
    panel.fillStyle(0x080818, 1);
    panel.fillRoundedRect(CX - pw / 2, CY - ph / 2, pw, ph, 36);
    panel.lineStyle(4, 0xFFD700, 1);
    panel.strokeRoundedRect(CX - pw / 2, CY - ph / 2, pw, ph, 36);

    this.add.text(CX, CY - ph * 0.37, '🎉', { fontSize: `${Math.round(ph * 0.18)}px` }).setOrigin(0.5).setDepth(72);

    this.add.text(CX, CY - ph * 0.12, 'AMAZING!', {
      fontFamily: 'Baloo 2', fontSize: `${Math.round(ph * 0.16)}px`, color: '#FFD700', fontStyle: 'bold',
      shadow: { offsetX: 3, offsetY: 5, color: '#000000', blur: 12, fill: true },
    }).setOrigin(0.5).setDepth(72);

    this.add.text(CX, CY + ph * 0.07, `You made ${ROUNDS} new words!`, {
      fontFamily: 'Baloo 2', fontSize: `${Math.round(ph * 0.075)}px`, color: '#FFFFFF',
    }).setOrigin(0.5).setDepth(72);

    this.add.text(CX, CY + ph * 0.19, `Score: ${this.score}`, {
      fontFamily: 'Baloo 2', fontSize: `${Math.round(ph * 0.095)}px`, color: '#74C0E8', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(72);

    const bw = Math.round(pw * 0.42);
    const bh = Math.round(ph * 0.145);
    const btnG = this.add.graphics().setDepth(72);
    const bx = CX - bw / 2;
    const by = CY + ph * 0.3;
    btnG.fillStyle(0xFF6B35, 1);
    btnG.fillRoundedRect(bx, by, bw, bh, bh / 2);
    btnG.lineStyle(3, 0xFFFFFF, 0.6);
    btnG.strokeRoundedRect(bx, by, bw, bh, bh / 2);

    this.add.text(CX, by + bh / 2, '▶  Play Again', {
      fontFamily: 'Baloo 2', fontSize: `${Math.round(bh * 0.46)}px`, color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(73);

    btnG.setInteractive(new Phaser.Geom.Rectangle(bx, by, bw, bh), Phaser.Geom.Rectangle.Contains);
    btnG.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart());
    });
    btnG.on('pointerover', () => { btnG.clear(); btnG.fillStyle(0xFF4400, 1); btnG.fillRoundedRect(bx, by, bw, bh, bh / 2); });
    btnG.on('pointerout', () => { btnG.clear(); btnG.fillStyle(0xFF6B35, 1); btnG.fillRoundedRect(bx, by, bw, bh, bh / 2); });
  }

  // ── Banner message ────────────────────────────────────────────────

  private bannerCont?: Phaser.GameObjects.Container;
  private bannerTimer?: Phaser.Time.TimerEvent;

  private showBanner(msg: string) {
    const { cx: CX, gh: GH } = this;
    this.bannerCont?.destroy();
    this.bannerTimer?.remove(false);

    const by = GH - Math.round(GH * 0.21);
    const c = this.add.container(CX, by + 10).setDepth(48).setAlpha(0);
    const tw = Math.min(msg.length * 14 + 60, this.gw * 0.6);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.55);
    bg.fillRoundedRect(-tw / 2, -26, tw, 52, 26);

    const txt = this.add.text(0, 0, msg, {
      fontFamily: 'Baloo 2', fontSize: '26px', color: '#FFFFFF', fontStyle: 'bold',
    }).setOrigin(0.5);

    c.add([bg, txt]);
    this.bannerCont = c;

    this.tweens.add({ targets: c, y: by, alpha: 1, duration: 280, ease: 'Back.easeOut' });
    this.bannerTimer = this.time.delayedCall(2200, () => {
      this.tweens.add({ targets: c, alpha: 0, duration: 240, onComplete: () => c.destroy() });
    });
  }
}
