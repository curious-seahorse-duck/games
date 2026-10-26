import * as Phaser from 'phaser';

export const STORY_CHAPTERS = [
  {
    title: 'THE NIGHT BELL', location: 'ABANDONED SCHOOL · 11:59 PM', color: 0x89ffb0,
    shots: ['ONE MINUTE TO MIDNIGHT', 'AN IMPOSSIBLE INVITATION', 'NO WAY BACK', 'FIRST CONTACT'],
    slides: [
      'At 11:59 PM, the abandoned school bell rang by itself.',
      'Sixty glowing invitations appeared beneath bedroom doors.',
      'The students entered. Behind them, the school vanished from every map.',
      'Above the roof, a green signal answered the final bell.',
    ],
  },
  {
    title: 'THE GREEN LIGHT', location: 'PLANETARIUM · SIGNAL DETECTED', color: 0x8df3ff,
    shots: ['THE PROJECTOR AWAKENS', 'CHOSEN BY THE SIGNAL', 'FROZEN FOOTPRINTS', 'A FACE IN THE CROWD'],
    slides: [
      'The planetarium projector woke without power.',
      'A beam searched every hallway and marked one student with alien frost.',
      'The first frozen footprints ended at a locked classroom.',
      'Someone—or something—had learned how to wear a human face.',
    ],
  },
  {
    title: 'THE BURNER CLUB', location: 'ROOM 108 · THE LAST WARM LIGHT', color: 0xffc77b,
    shots: ['A PLACE TO HIDE', 'BUILT FROM SCRAPS', 'THIRTY SECONDS OF HOPE', 'NOBODY LEFT BEHIND'],
    slides: [
      'Room 108 was still warm. The Burner Club gathered there.',
      'They built thaw tools from science-lab coils and cafeteria heaters.',
      'Every rescue made the alien signal stronger for thirty seconds.',
      'The team promised that nobody would be left frozen.',
    ],
  },
  {
    title: 'THE HIDDEN BROADCAST', location: 'UFOTUBE · UNKNOWN FREQUENCY', color: 0xc1a0ff,
    shots: ['WE ARE LIVE', 'VIEWERS FROM THE VOID', 'AN URGENT MESSAGE', 'BENEATH THE LOBBY'],
    slides: [
      'A secret UFOtube channel began broadcasting the matches.',
      'The viewers were not on Earth, yet their Alien Bits were real.',
      'One message repeated: FIND THE FALSE PRINCIPAL.',
      'The broadcast map revealed a tunnel beneath the main lobby.',
    ],
  },
  {
    title: 'THE FALSE PRINCIPAL', location: 'PRINCIPAL’S OFFICE · ACCESS DENIED', color: 0xff8ea7,
    shots: ['FOLLOW MY VOICE', 'THIRTEEN YEARS EMPTY', 'THE CROWN TRANSMITTER', 'THE FINAL COMMAND'],
    slides: [
      'The intercom gave perfect orders in the principal’s voice.',
      'But the real principal’s office had been empty for thirteen years.',
      'Behind the trophy case waited a transmitter shaped like a crown.',
      'Its final command was simple: FREEZE THE TOWN.',
    ],
  },
  {
    title: 'THE FINAL THAW', location: 'SIGNAL CHAMBER · BEFORE SUNRISE', color: 0x8bffcf,
    shots: ['TOGETHER INTO THE CORE', 'HOLD THE LINE', 'THE FIRST SUNRISE', 'THE NEXT SIGNAL'],
    slides: [
      'Humans and friendly aliens reached the signal chamber together.',
      'The Burner Club held back the frost while the runners crossed the core.',
      'At sunrise, the school returned to the map—but the UFO stayed.',
      'The final thaw was only the beginning of the next signal.',
    ],
  },
];

// A 640 × 360 illustration stage shared by the menu trailer and story player.
// All animation belongs to the stage and is disposed when its shot changes.
export function drawStoryArtwork(
  scene: Phaser.Scene, x: number, y: number, chapter: number, shot: number,
  reducedMotion: boolean, accent = STORY_CHAPTERS[chapter].color,
): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y);
  const animations: Phaser.Tweens.Tween[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => { root.add(object); return object; };
  const animate = (config: Phaser.Types.Tweens.TweenBuilderConfig): void => {
    if (!reducedMotion) animations.push(scene.tweens.add(config));
  };
  root.once('destroy', () => animations.forEach((tween) => tween.remove()));
  const rect = (px: number, py: number, w: number, h: number, color: number, alpha = 1) => add(scene.add.rectangle(px, py, w, h, color, alpha));
  const circle = (px: number, py: number, radius: number, color: number, alpha = 1) => add(scene.add.circle(px, py, radius, color, alpha));
  const text = (px: number, py: number, value: string, size: number, color = '#daf4ef') => add(scene.add.text(px, py, value, { fontFamily: 'Arial Black', fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5));
  const background = add(scene.add.graphics());
  background.fillGradientStyle(0x040b1c, chapter === 2 ? 0x352039 : 0x221537, 0x0c2732, chapter === 5 ? 0x30675a : 0x10182c, 1);
  background.fillRect(0, 0, 640, 360);
  for (let index = 0; index < 45; index += 1) {
    const star = circle(12 + ((index * 137) % 610), 18 + ((index * 53) % 180), index % 7 === 0 ? 1.7 : 0.8, 0xd6ecff, 0.25 + (index % 4) * 0.12);
    if (index % 8 === 0) animate({ targets: star, alpha: 0.12, duration: 1400 + index * 20, yoyo: true, repeat: -1 });
  }
  const actor = (px: number, py: number, color: number, frozen = false, alien = false) => {
    const person = add(scene.add.container(px, py));
    person.add([
      scene.add.ellipse(0, 27, 39, 10, 0x000000, 0.32),
      scene.add.rectangle(-8, 19, 8, 16, 0x10182b), scene.add.rectangle(8, 19, 8, 16, 0x10182b),
      scene.add.rectangle(0, 0, 28, 31, color).setStrokeStyle(1.5, 0xc4f5ff, 0.3),
      scene.add.circle(0, -24, 15, alien ? 0x8bffab : 0xecc9ae),
      scene.add.ellipse(-5, -25, alien ? 7 : 3, alien ? 10 : 4, 0x071321),
      scene.add.ellipse(5, -25, alien ? 7 : 3, alien ? 10 : 4, 0x071321),
    ]);
    if (frozen) {
      person.add(scene.add.rectangle(0, -4, 47, 77, 0x9beeff, 0.3).setStrokeStyle(2, 0xbeffff, 0.8));
      person.add(scene.add.line(0, 0, -18, -30, 13, 26, 0xd8ffff, 0.7));
    } else animate({ targets: person, y: py - 3, angle: shot % 2 ? -2 : 2, duration: 850, yoyo: true, repeat: -1 });
    return person;
  };
  const saucer = (px: number, py: number) => {
    const ufo = add(scene.add.container(px, py));
    ufo.add([
      scene.add.triangle(0, 110, 0, 0, 160, 200, -160, 200, accent, 0.06),
      scene.add.ellipse(0, 0, 150, 37, 0x655598).setStrokeStyle(2, 0xe3ceff, 0.8),
      scene.add.arc(0, -8, 39, 180, 360, false, 0x99ffc0, 0.9),
      ...[-50, -25, 0, 25, 50].map((offset) => scene.add.circle(offset, 5, 3, accent)),
    ]);
    animate({ targets: ufo, x: px + 40, y: py + 12, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    return ufo;
  };
  const hallway = () => {
    const lines = add(scene.add.graphics());
    lines.fillStyle(0x09121f); lines.fillTriangle(0, 360, 320, 185, 640, 360);
    lines.lineStyle(1, accent, 0.17);
    [0, 80, 160, 480, 560, 640].forEach((edge) => lines.lineBetween(320, 185, edge, 360));
    for (let row = 0; row < 5; row += 1) lines.lineBetween(0, 225 + row * row * 7, 640, 225 + row * row * 7);
    for (let col = 0; col < 4; col += 1) {
      rect(55 + col * 175, 170, 70, 145, 0x172735).setStrokeStyle(2, 0x3d6170, 0.7);
      rect(55 + col * 175, 136, 43, 57, accent, col === shot ? 0.25 : 0.05);
    }
  };

  if (chapter === 0 || (chapter === 5 && shot >= 2)) {
    const sunrise = chapter === 5;
    circle(525, 86, 37, sunrise ? 0xffdcaa : 0xd1d9ee, 0.8);
    circle(525, 86, 52, sunrise ? 0xffc98b : 0xb8ceff, 0.06);
    for (let index = 0; index < 9; index += 1) rect(index * 85, 248, 45 + (index % 3) * 20, 180 + (index % 4) * 20, 0x091321);
    rect(320, 266, 400, 165, 0x1a293b).setStrokeStyle(2, 0x4a7081);
    add(scene.add.triangle(320, 151, -235, 40, 0, -60, 235, 40, 0x27394c).setStrokeStyle(2, 0x58768c));
    rect(320, 161, 60, 81, 0x20364a).setStrokeStyle(2, accent, 0.5);
    circle(320, 140, 15, 0x101e30).setStrokeStyle(1.5, accent);
    add(scene.add.line(320, 140, 0, -10, 0, 0, accent));
    add(scene.add.line(320, 140, 0, 0, 8, 0, accent));
    for (let index = 0; index < 12; index += 1) {
      const window = rect(153 + (index % 6) * 66, 221 + Math.floor(index / 6) * 48, 25, 31, (index + shot) % 4 === 0 ? accent : 0x0b1727, 0.9);
      if ((index + shot) % 4 === 0) animate({ targets: window, alpha: 0.3, duration: 1800, yoyo: true, repeat: -1 });
    }
    rect(320, 316, 44, 65, 0x040c16).setStrokeStyle(2, accent, 0.4);
    rect(320, 354, 640, 12, 0x091520);
    saucer(shot === 3 ? 330 : 142 + shot * 65, 80);
    actor(250 + shot * 22, 315, 0x9973df);
    actor(370 - shot * 12, 320, sunrise ? 0x75e89d : 0xdf8672, false, sunrise);
    if (shot === 1) {
      for (let index = 0; index < 4; index += 1) {
        const letter = rect(175 + index * 85, 236 - index % 2 * 32, 30, 21, 0xffebc2).setAngle(-14 + index * 9);
        animate({ targets: letter, y: letter.y - 20, angle: letter.angle + 16, duration: 1800 + index * 150, yoyo: true, repeat: -1 });
      }
    }
  } else if (chapter === 1) {
    hallway();
    circle(320, 121, 83, 0x64e6ff, 0.07).setStrokeStyle(1, 0x6ceaff, 0.4);
    for (let orbit = 0; orbit < 3; orbit += 1) add(scene.add.ellipse(320, 121, 230 - orbit * 30, 45 + orbit * 30, 0x000000, 0).setStrokeStyle(1, accent, 0.3).setAngle(orbit * 55));
    const projector = rect(320, 270, 58, 32, 0x4b6172).setStrokeStyle(2, accent, 0.8);
    const beam = add(scene.add.triangle(320, 173, -65, -55, 65, -55, 0, 95, accent, 0.14));
    animate({ targets: beam, alpha: 0.4, scaleX: 1.2, duration: 1600, yoyo: true, repeat: -1 });
    animate({ targets: projector, alpha: 0.6, duration: 600, yoyo: true, repeat: -1 });
    actor(450, 283, 0x71a7e3, shot === 1 || shot === 2, shot === 3);
    actor(190, 301, 0xb087e3);
    if (shot >= 2) for (let index = 0; index < 6; index += 1) add(scene.add.ellipse(340 + index * 17, 316 - index * 7, 8, 15, accent, 0.5).setAngle(20));
  } else if (chapter === 2) {
    hallway();
    circle(320, 200, 115, 0xffb46b, 0.08);
    rect(320, 112, 230, 66, 0x132b2e).setStrokeStyle(3, 0x668e74);
    text(320, 105, shot === 3 ? 'NOBODY LEFT BEHIND' : 'BURNER CLUB · ROOM 108', 13, '#ffe0a4');
    rect(320, 275, 250, 18, 0x795752).setStrokeStyle(2, 0xbb8e74);
    rect(220, 310, 12, 64, 0x32444c); rect(420, 310, 12, 64, 0x32444c);
    for (let index = 0; index < 4; index += 1) {
      rect(245 + index * 49, 252, 22, 30, index % 2 ? 0x90ebda : 0xffba71, 0.7).setStrokeStyle(2, 0xffe4bc, 0.4);
      const spark = circle(245 + index * 49, 225, 3, 0xffdba1, 0.7);
      animate({ targets: spark, y: 199, alpha: 0.1, duration: 900 + index * 180, yoyo: true, repeat: -1 });
    }
    actor(158, 296, 0xe5a05e); actor(480, 297, 0x89caba, shot === 2);
    if (shot >= 2) {
      const warmth = circle(480, 280, 56, accent, 0.1).setStrokeStyle(2, accent, 0.4);
      animate({ targets: warmth, scale: 1.4, alpha: 0.1, duration: 1400, yoyo: true, repeat: -1 });
    }
  } else if (chapter === 3) {
    rect(320, 205, 550, 230, 0x0b1429).setStrokeStyle(3, 0x5b5884);
    for (let monitor = 0; monitor < 3; monitor += 1) {
      const px = 151 + monitor * 170;
      rect(px, 183, 146, 131, 0x122d3a).setStrokeStyle(3, accent, 0.7);
      for (let row = 0; row < 5; row += 1) rect(px, 136 + row * 24, 134, 1, accent, 0.08);
      rect(px, 266, 7, 30, 0x536778); rect(px, 284, 65, 7, 0x536778);
      if (monitor === 1) {
        text(px, 159, shot === 2 ? 'FIND THE' : '● LIVE', 14, '#9cffb4');
        text(px, 185, shot === 2 ? 'FALSE PRINCIPAL' : 'UFOTUBE', 12, '#e3d3ff');
        text(px, 216, shot === 1 ? 'VIEWERS: ???' : 'SIGNAL ACTIVE', 9, '#8fc6d4');
      } else {
        const wave = add(scene.add.graphics()); wave.lineStyle(2, accent, 0.5);
        for (let point = 0; point < 12; point += 1) wave.lineBetween(px - 60 + point * 10, 181 + Math.sin(point * 1.7 + shot) * 23, px - 50 + point * 10, 181 + Math.sin((point + 1) * 1.7 + shot) * 23);
        animate({ targets: wave, alpha: 0.25, duration: 1000, yoyo: true, repeat: -1 });
      }
    }
    actor(320, 316, 0x967be2);
    if (shot === 3) { rect(320, 294, 110, 35, 0x04101b).setStrokeStyle(2, accent); text(320, 294, '↓ TUNNEL', 12); }
  } else if (chapter === 4) {
    hallway();
    rect(320, 147, 208, 161, 0x211c32).setStrokeStyle(3, 0x726077);
    text(320, 99, 'PRINCIPAL', 14, '#ddc8d5');
    const crown = add(scene.add.star(320, 175, 5, 22, 49, shot >= 2 ? 0xffcf76 : 0x4f3d53).setAngle(180));
    if (shot >= 2) {
      const signal = circle(320, 175, 68, accent, 0.07).setStrokeStyle(2, accent, 0.5);
      animate({ targets: signal, scale: 1.35, alpha: 0.2, duration: 1300, yoyo: true, repeat: -1 });
      animate({ targets: crown, y: 165, duration: 1800, yoyo: true, repeat: -1 });
    }
    rect(320, 290, 270, 45, 0x49364b).setStrokeStyle(2, 0x877181);
    rect(320, 306, 34, 45, 0x182338);
    text(320, 247, shot === 3 ? 'FREEZE THE TOWN' : shot === 1 ? 'LAST SEEN: 13 YEARS AGO' : 'PLEASE FOLLOW MY VOICE', 11, '#ffa9bc');
    actor(135, 305, 0x967be2); actor(505, 305, 0x6dbca9);
  } else {
    hallway();
    for (let radius = 95; radius >= 40; radius -= 25) {
      const ring = circle(320, 183, radius, accent, 0.035).setStrokeStyle(2, accent, 0.4);
      animate({ targets: ring, scale: 1.1, alpha: 0.3, duration: 1600 + radius * 4, yoyo: true, repeat: -1 });
    }
    const core = add(scene.add.star(320, 183, 8, 26, 52, 0xb4ffe8, 0.8));
    animate({ targets: core, angle: 360, duration: 18000, repeat: -1 });
    rect(320, 290, 350, 9, 0x63868c).setStrokeStyle(2, accent, 0.3);
    actor(200 + shot * 20, 278, 0xe6a269); actor(440 - shot * 20, 278, 0x8d79d5, false, true);
    actor(110, 304, 0x79bde1, shot === 1);
  }

  // Slow foreground atmosphere gives each shot depth without obscuring the cast.
  const fog = add(scene.add.ellipse(280, 340, 460, 36, accent, 0.04));
  animate({ targets: fog, x: 350, alpha: 0.08, duration: 5000, yoyo: true, repeat: -1 });
  for (let index = 0; index < 9; index += 1) {
    const mote = circle(30 + (index * 71) % 580, 95 + (index * 39) % 225, 1.4, accent, 0.28);
    animate({ targets: mote, y: mote.y - 30, alpha: 0.05, duration: 2300 + index * 190, yoyo: true, repeat: -1 });
  }
  return root;
}
