// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

class VBTutorial {
  NS = 'http://www.w3.org/2000/svg'

  constructor(config, heightScaleFactor, courtScaleFactor) {
    const svgWidth = (typeof config.width === 'number') ? config.width : 900
    this.svg = {
      width: svgWidth,
      height: svgWidth * heightScaleFactor,
      scale: svgWidth * courtScaleFactor
    }
    console.log(`drawing ${this.svg.width} by ${this.svg.height}`)
    this.colours = {
      backgroundColour: (config.colours && typeof config.colours.backgroundColour === 'string') ? config.colours.backgroundColour : '#63b6e0',
      courtColour: (config.colours && typeof config.colours.courtColour === 'string') ? config.colours.courtColour : '#ffb591',
      lineColour: (config.colours && typeof config.colours.lineColour === 'string') ? config.colours.lineColour : 'white',
      playerOutlineColour: (config.colours && typeof config.colours.playerOutlineColour === 'string') ? config.colours.playerOutlineColour : '#f5f5f5',
      playerColour: (config.colours && typeof config.colours.playerColour === 'string') ? config.colours.playerColour : '#efa581',
      playerColourHighlight: (config.colours && typeof config.colours.playerColourHighlight === 'string') ? config.colours.playerColourHighlight : '#66dd66',
      tutorialColour: (config.colours && typeof config.colours.tutorialColour === 'string') ? config.colours.tutorialColour : '#7ec485',
      tutorialFade: (config.colours && typeof config.colours.tutorialFade === 'string') ? config.colours.tutorialFade : '#999999',
      verifyColour: (config.colours && typeof config.colours.verifyColour === 'string') ? config.colours.verifyColour : '#7ec485',
    }
    this.svg.svgRoot = document.createElementNS(this.NS, 'svg')
    this.svg.svgRoot.setAttribute('width', this.svg.width)
    this.svg.svgRoot.setAttribute('height', this.svg.height)
    this.svg.snapRoot = Snap(this.svg.svgRoot)
  }

  getSVG() {
    return this.svg.svgRoot
  }
}

class VBTutorialServeReceieve extends VBTutorial {
  /*
  * We want to use the same internal units as the court itself, which is 1100 units wide
  * and our tutorial will be 1700x1600 units, so we will have a scaling factor of
  * {image-width} / 1700, and we allow the court to be (11/17) of our width.
  *
  * The image itself defaults to 900px wide, with the height being set to 16/17 * {width}
  * We could use a transformation, but I'd rather have the final SVG to be "clean"
  */

  constructor(config) {
    super(config, (16 / 17), (1 / 1700))
    this.svg.rotationControlCirleRadius = this.svg.width * (24 / 1700)

    this.colours.rotationControlColour = (config.colours && typeof config.colours.rotationControlColour === 'string') ? config.colours.rotationControlColour : '#ffffff'
    this.colours.rotationControlHighlightColour = (config.colours && typeof config.colours.rotationControlHighlightColour === 'string') ? config.colours.rotationControlHighlightColour : '#dddddd'
    this.colours.rotationControlBackgroundColourA = (config.colours && typeof config.colours.rotationControlBackgroundColourA === 'string') ? config.colours.rotationControlBackgroundColourA : '#65b6df'
    this.colours.rotationControlBackgroundColourB = (config.colours && typeof config.colours.rotationControlBackgroundColourB === 'string') ? config.colours.rotationControlBackgroundColourB : '#4596bf'

    this.text = {
      'en': {
        players: {
          51: { s: 'S', o: 'OP', m2: 'M2', m1: 'M1', h1: 'H1', h2: 'H2', l: 'L' },
          '51b': { s: 'S', o: 'OP', m2: 'M2', m1: 'M1', h1: 'H1', h2: 'H2', l: 'L' },
          '3M': { s: 'S', o: 'M3', m2: 'H1', m1: 'M1', h1: 'M2', h2: 'H2', l: 'L' },
          63: { s: 'S1', o: 'H2', m2: 'S2', m1: 'H3', h1: 'H1', h2: 'S3', l: 'L' },
          62: { s: 'S1', o: 'S2', m2: 'M2', m1: 'M1', h1: 'H1', h2: 'H2', l: 'L' },
          '62b': { s: 'S1', o: 'S2', m2: 'M2', m1: 'M1', h1: 'H1', h2: 'H2', l: 'L' },
          42: { s: 'S1', o: 'S2', m2: 'M2', m1: 'M1', h1: 'H1', h2: 'H2', l: 'L' }
        },
        rotationControl: {
          51: { serving: 'Serving', receiving: 'Receiving', s1: 'Setter @zone 1\nor rotation 1', s2: 'Setter @zone 2\nor rotation 6', s3: 'Setter @zone 3\nor rotation 5', s4: 'Setter @zone 4\nor rotation 4', s5: 'Setter @zone 5\nor rotation 3', s6: 'Setter @zone 6\nor rotation 2' },
          '51b': { serving: 'Serving', receiving: 'Receiving', s1: 'Setter @zone 1\nor rotation 1', s2: 'Setter @zone 2\nor rotation 6', s3: 'Setter @zone 3\nor rotation 5', s4: 'Setter @zone 4\nor rotation 4', s5: 'Setter @zone 5\nor rotation 3', s6: 'Setter @zone 6\nor rotation 2' },
          '3M': { serving: 'Serving', receiving: 'Receiving', s1: 'Setter @zone 1\nor rotation 1', s2: 'Setter @zone 2\nor rotation 6', s3: 'Setter @zone 3\nor rotation 5', s4: 'Setter @zone 4\nor rotation 4', s5: 'Setter @zone 5\nor rotation 3', s6: 'Setter @zone 6\nor rotation 2' },
          63: { serving: 'Serving', receiving: 'Receiving', s1: 'rotation 1', s2: 'rotation 6', s3: 'rotation 5', s4: 'rotation 4', s5: 'rotation 3', s6: 'rotation 2' },
          62: { serving: 'Serving', receiving: 'Receiving', s1: 'rotation 1', s2: 'rotation 6', s3: 'rotation 5', s4: 'rotation 4', s5: 'rotation 3', s6: 'rotation 2' },
          '62b': { serving: 'Serving', receiving: 'Receiving', s1: 'rotation 1', s2: 'rotation 6', s3: 'rotation 5', s4: 'rotation 4', s5: 'rotation 3', s6: 'rotation 2' },
          42: { serving: 'Serving', receiving: 'Receiving', s1: 'rotation 1', s2: 'rotation 6', s3: 'rotation 5', s4: 'rotation 4', s5: 'rotation 3', s6: 'rotation 2' }
        },
        actionControl: { servingBase: 'Base', serve: 'Serve', set: 'Set', switch: 'Defense', pass: 'Pass', attack: 'Attack' },
        tutorial: [
          'Tutorial',
          'Next',
          'This is a player. Double-click any to\nhighlight and follow it.\n\nH=Hitter, M=Middle, S=Setter,\nOP=Opposite, L=Libero',
          'You can move the players around the\ncourt manually, or use the interactive \nfeature which automatically place the \nplayers in their respective positions.',
          'This navigation allows you to select\neach rotation when serving or receiving.\nClick on the circle to change the rotation.\nEach rotation is labeled with a rotation\nnumber.',
          'These are for when you are serving',
          'These are for when you are\nreceiving',
          'Moving from circle to circle makes\n you rotate like in a match',
          'This lets you select the phase of\n the rally.  The players will then\nmove around the court',
          'These show the player positions\n when your side is serving',
          'These show the player positions\n when your side is receiving',
        ],
        checkOverlapBtn: 'Check Overlap',
        noOverlap: 'No overlap detected! Formation is legal.',
        overlapNotApplicable: 'Overlap rules only apply during serve-receive formations.',
        verify: 'Detected Overlap - '        
      },
      'it': {
        players: {
          51: { s: 'P', o: 'OP', m2: 'C2', m1: 'C1', h1: 'S1', h2: 'S2', l: 'L' },
          '51b': { s: 'P', o: 'OP', m2: 'C2', m1: 'C1', h1: 'S1', h2: 'S2', l: 'L' },
          '3M': { s: 'P', o: 'C3', m2: 'S1', m1: 'C1', h1: 'C2', h2: 'S2', l: 'L' },
          63: { s: 'P1', o: 'S2', m2: 'P2', m1: 'S3', h1: 'S1', h2: 'P3', l: 'L' },
          62: { s: 'P1', o: 'P2', m2: 'C2', m1: 'C1', h1: 'S1', h2: 'S2', l: 'L' },
          '62b': { s: 'P1', o: 'P2', m2: 'C2', m1: 'C1', h1: 'S1', h2: 'S2', l: 'L' },
          42: { s: 'P1', o: 'P2', m2: 'C2', m1: 'C1', h1: 'S1', h2: 'S2', l: 'L' }
        },
        rotationControl: {
          51: { serving: 'Servizio', receiving: 'Ricezione', s1: 'P1', s2: 'P2', s3: 'P3', s4: 'P4', s5: 'P5', s6: 'P6' },
          '51b': { serving: 'Servizio', receiving: 'Ricezione', s1: 'P1', s2: 'P2', s3: 'P3', s4: 'P4', s5: 'P5', s6: 'P6' },
          '3M': { serving: 'Servizio', receiving: 'Ricezione', s1: 'P1', s2: 'P2', s3: 'P3', s4: 'P4', s5: 'P5', s6: 'P6' },
          63: { serving: 'Servizio', receiving: 'Ricezione', s1: 'P1', s2: 'P2', s3: 'P3', s4: 'P4', s5: 'P5', s6: 'P6' },
          62: { serving: 'Servizio', receiving: 'Ricezione', s1: 'P1', s2: 'P2', s3: 'P3', s4: 'P4', s5: 'P5', s6: 'P6' },
          '62b': { serving: 'Servizio', receiving: 'Ricezione', s1: 'P1', s2: 'P2', s3: 'P3', s4: 'P4', s5: 'P5', s6: 'P6' },
          42: { serving: 'Servizio', receiving: 'Ricezione', s1: 'P1', s2: 'P2', s3: 'P3', s4: 'P4', s5: 'P5', s6: 'P6' }
        },
        actionControl: { servingBase: 'Base', serve: 'Servizio', set: 'Alzata', switch: 'Difesa', pass: 'Ricezione', attack: 'Attacco' },
        tutorial: [
          'Tutorial',
          'Avanti',
          'Questo Ã¨ un giocatore.\nFai doppio clic per evidenziarlo.\nS=Schiacciatore, C=Centrale,\n P=Palleggiatore, O=Opposton\nL=Libero',
          'Questo Ã¨ in campo con tutti e\n 6 i giocatori.\nAl clic sui bottoni, i giocatori\n si muoveranno intorno al campo',
          'Questo ti permette di scegliere\nla formazione di partenza.\nIl clic sul cerchio cambia la rotazione.\nOgni rotazione Ã¨ etichettata con la\nposizione dell\'alzatore (P)',
          'Questo mostra la situazione in cui\nla squadra Ã¨ al servizio',
          'Questo mostra la situazione in cui\nla squadra Ã¨ in ricezione',
          'Spostandosi da un cerchio ad un\nsi simulano le rotazioni come\ndurante una gara',
          'Da qui si selezionano le situazioni\n di gioco.\nI giocatori si muoveranno nel campo\ndi conseguenza',
          'Qui si hanno le posizioni dei\n giocatori quando la squadra\n Ã¨ al servizio',
          'Qui si hanno le posizioni dei\n giocatori quando la squadra\n Ã¨ in ricezione',
        ],
        checkOverlapBtn: 'Controlla',
        noOverlap: 'Nessuna sovrapposizione rilevata! Posizione regolare.',
        overlapNotApplicable: 'Le regole di sovrapposizione si applicano solo in ricezione.',
        verify: 'Sovrapposizione rilevata - '
      },
      'fr': {
        players: {
          51: { s: 'Pa', o: 'Po', m2: 'C2', m1: 'C1', h1: 'A1', h2: 'A2', l: 'L' },
          '51b': { s: 'Pa', o: 'Po', m2: 'C2', m1: 'C1', h1: 'A1', h2: 'A2', l: 'L' },
          '3M': { s: 'Pa', o: 'C3', m2: 'A1', m1: 'C1', h1: 'C2', h2: 'A2', l: 'L' },
          63: { s: 'P1', o: 'A2', m2: 'P2', m1: 'A3', h1: 'A1', h2: 'S3', l: 'L' },
          62: { s: 'Pa', o: 'Pa', m2: 'C2', m1: 'C1', h1: 'A1', h2: 'A2', l: 'L' },
          '62b': { s: 'Pa', o: 'Pa', m2: 'C2', m1: 'C1', h1: 'A1', h2: 'A2', l: 'L' },
          42: { s: 'Pa', o: 'Pa', m2: 'C2', m1: 'C1', h1: 'A1', h2: 'A2', l: 'L' }
        },
        rotationControl: {
          51: { serving: 'Service', receiving: 'RÃ©cevoir', s1: 'Passeur a 1', s2: 'Passeur a 2', s3: 'Passeur a 3', s4: 'Passeur a 4', s5: 'Passeur a 5', s6: 'Passeur a 6' },
          '51b': { serving: 'Service', receiving: 'RÃ©cevoir', s1: 'Passeur a 1', s2: 'Passeur a 2', s3: 'Passeur a 3', s4: 'Passeur a 4', s5: 'Passeur a 5', s6: 'Passeur a 6' },
          '3M': { serving: 'Service', receiving: 'RÃ©cevoir', s1: 'Passeur a 1', s2: 'Passeur a 2', s3: 'Passeur a 3', s4: 'Passeur a 4', s5: 'Passeur a 5', s6: 'Passeur a 6' },
          63: { serving: 'Service', receiving: 'RÃ©cevoir', s1: 'Passeur a 1', s2: 'Passeur a 2', s3: 'Passeur a 3', s4: 'Passeur a 4', s5: 'Passeur a 5', s6: 'Passeur a 6' },
          62: { serving: 'Service', receiving: 'RÃ©cevoir', s1: 'Passeur a 1', s2: 'Passeur a 2', s3: 'Passeur a 3', s4: 'Passeur a 4', s5: 'Passeur a 5', s6: 'Passeur a 6' },
          '62b': { serving: 'Service', receiving: 'RÃ©cevoir', s1: 'Passeur a 1', s2: 'Passeur a 2', s3: 'Passeur a 3', s4: 'Passeur a 4', s5: 'Passeur a 5', s6: 'Passeur a 6' },
          42: { serving: 'Service', receiving: 'RÃ©cevoir', s1: 'Passeur a 1', s2: 'Passeur a 2', s3: 'Passeur a 3', s4: 'Passeur a 4', s5: 'Passeur a 5', s6: 'Passeur a 6' }
        },
        actionControl: { servingBase: 'Base', serve: 'Service', set: 'Passe', switch: 'DÃ©fense', pass: 'RÃ©cevoir', attack: 'Attaque' },
        tutorial: [
          'Tutorial',
          'Next',
          'To jest odtwarzacz. \nDwukrotnie kliknij, aby to zaznaczyÄ‡.\n\nA=Attaquant, C=Central,\nPa=Passeur, Po=Pointu\nL=Libero',
          'Vous pouvez dÃ©placer manuellement \nles joueurs sur le terrain, ou \nutiliser la fonction interactive qui \nplace automatiquement les joueurs \ndans leurs positions respectives.',
          'Cela vous permet de sÃ©lectionner \nles rotations. Cliquez sur le \ncercle pour changer de rotation. \nChacun est Ã©tiquetÃ© avec la position \ndu passeur.',
          'Ces Ã©lÃ©ments sont pour lorsque \nvous servez.',
          'Ces Ã©lÃ©ments sont pour lorsque \nvous recevez.',
          'Se dÃ©placer d\'un cercle Ã  l\'autre \nvous fait pivoter comme dans un match.',
          'Cela vous permet de sÃ©lectionner la \nphase du rallye. Les joueurs se \ndÃ©placeront ensuite sur le terrain.',
          'Ces Ã©lÃ©ments montrent les positions \ndes joueurs lorsque votre Ã©quipe sert.',
          'Ces Ã©lÃ©ments montrent les positions \ndes joueurs lorsque votre Ã©quipe reÃ§oit.',
        ],
        checkOverlapBtn: 'VÃ©rifier',
        noOverlap: 'Aucun chevauchement dÃ©tectÃ© ! Formation lÃ©gale.',
        overlapNotApplicable: 'Les rÃ¨gles de position s\'appliquent uniquement en rÃ©ception.',
        verify: 'Chevauchement dÃ©tectÃ© - '
      },
      'pl': {
        players: {
          51: { s: 'R', o: 'A', m2: 'S2', m1: 'S1', h1: 'P1', h2: 'P2', l: 'L' },
          '51b': { s: 'R', o: 'A', m2: 'S2', m1: 'S1', h1: 'P1', h2: 'P2', l: 'L' },
          '3M': { s: 'R', o: 'S3', m2: 'P1', m1: 'S1', h1: 'S2', h2: 'P2', l: 'L' },
          63: { s: 'R1', o: 'P2', m2: 'R2', m1: 'P3', h1: 'P1', h2: 'R3', l: 'L' },
          62: { s: 'R1', o: 'R2', m2: 'S2', m1: 'S1', h1: 'P1', h2: 'P2', l: 'L' },
          '62b': { s: 'R1', o: 'R2', m2: 'S2', m1: 'S1', h1: 'P1', h2: 'P2', l: 'L' },
          42: { s: 'R1', o: 'R2', m2: 'S2', m1: 'S1', h1: 'P1', h2: 'P2', l: 'L' }
        },
        rotationControl: {
          51: { serving: 'Serwis', receiving: 'PrzyjÄ™cie', s1: 'RozgrywajÄ…cy\nna pozycji nr 1', s2: 'RozgrywajÄ…cy\nna pozycji nr 2', s3: 'RozgrywajÄ…cy\nna pozycji nr 3', s4: 'RozgrywajÄ…cy\nna pozycji nr 4', s5: 'RozgrywajÄ…cy\nna pozycji nr 5', s6: 'RozgrywajÄ…cy\nna pozycji nr 6' },
          '51b': { serving: 'Serwis', receiving: 'PrzyjÄ™cie', s1: 'RozgrywajÄ…cy\nna pozycji nr 1', s2: 'RozgrywajÄ…cy\nna pozycji nr 2', s3: 'RozgrywajÄ…cy\nna pozycji nr 3', s4: 'RozgrywajÄ…cy\nna pozycji nr 4', s5: 'RozgrywajÄ…cy\nna pozycji nr 5', s6: 'RozgrywajÄ…cy\nna pozycji nr 6' },
          '3M': { serving: 'Serwis', receiving: 'PrzyjÄ™cie', s1: 'RozgrywajÄ…cy\nna pozycji nr 1', s2: 'RozgrywajÄ…cy\nna pozycji nr 2', s3: 'RozgrywajÄ…cy\nna pozycji nr 3', s4: 'RozgrywajÄ…cy\nna pozycji nr 4', s5: 'RozgrywajÄ…cy\nna pozycji nr 5', s6: 'RozgrywajÄ…cy\nna pozycji nr 6' },
          63: { serving: 'Serwis', receiving: 'PrzyjÄ™cie', s1: 'RozgrywajÄ…cy\nna pozycji nr 1', s2: 'RozgrywajÄ…cy\nna pozycji nr 2', s3: 'RozgrywajÄ…cy\nna pozycji nr 3', s4: 'RozgrywajÄ…cy\nna pozycji nr 4', s5: 'RozgrywajÄ…cy\nna pozycji nr 5', s6: 'RozgrywajÄ…cy\nna pozycji nr 6' },
          62: { serving: 'Serwis', receiving: 'PrzyjÄ™cie', s1: 'RozgrywajÄ…cy\nna pozycji nr 1', s2: 'RozgrywajÄ…cy\nna pozycji nr 2', s3: 'RozgrywajÄ…cy\nna pozycji nr 3', s4: 'RozgrywajÄ…cy\nna pozycji nr 4', s5: 'RozgrywajÄ…cy\nna pozycji nr 5', s6: 'RozgrywajÄ…cy\nna pozycji nr 6' },
          '62b': { serving: 'Serwis', receiving: 'PrzyjÄ™cie', s1: 'RozgrywajÄ…cy\nna pozycji nr 1', s2: 'RozgrywajÄ…cy\nna pozycji nr 2', s3: 'RozgrywajÄ…cy\nna pozycji nr 3', s4: 'RozgrywajÄ…cy\nna pozycji nr 4', s5: 'RozgrywajÄ…cy\nna pozycji nr 5', s6: 'RozgrywajÄ…cy\nna pozycji nr 6' },
          42: { serving: 'Serwis', receiving: 'PrzyjÄ™cie', s1: 'RozgrywajÄ…cy\nna pozycji nr 1', s2: 'RozgrywajÄ…cy\nna pozycji nr 2', s3: 'RozgrywajÄ…cy\nna pozycji nr 3', s4: 'RozgrywajÄ…cy\nna pozycji nr 4', s5: 'RozgrywajÄ…cy\nna pozycji nr 5', s6: 'RozgrywajÄ…cy\nna pozycji nr 6' }
        },
        actionControl: { servingBase: 'Ustawienie\npoczÄ…tkowe', serve: 'Serwis', set: 'Rozegranie', switch: 'Obrona', pass: 'PrzyjÄ™cie', attack: 'Atak' },
        tutorial: [
          'Samouczek',
          'NastÄ™pny',
          'To jest odtwarzacz. \nDwukrotnie kliknij, aby to zaznaczyÄ‡.\n\nP=PrzyjmujÄ…cy, S=Åšrodkowy,\nR=RozgrywajÄ…cy, A=AtakujÄ…cy\nL=Libero',
          'To jest boisko ze wszystkimi\nszeÅ›cioma graczami. KlikajÄ…c w\nprzyciski sprawisz,Å¼e zawodnicy\nbÄ™dÄ… poruszaÄ‡ siÄ™ po boisku',
          'Tutaj moÅ¼esz wybraÄ‡ rotacje.\nNaciÅ›nij na kÃ³Å‚ko, Å¼eby zmieniÄ‡\nrotacjÄ™. nKaÅ¼da jest oznaczona\nz pozycjÄ… rozgrywajÄ…cego',
          'To sÄ… rotacje gdy serwujesz',
          'To sÄ… rotacje gdy odbierasz\nzagrywkÄ™',
          'Poruszanie siÄ™ od kÃ³Å‚ka do kÃ³Å‚ka,\npowoduje rotacje jak podczas meczu',
          'To pozwoli Ci wybraÄ‡ fazÄ™ akcji.\nZawodnicy bÄ™dÄ… wtedy poruszaÄ‡ siÄ™\npo boisku',
          'To pokazuje pozycjÄ™ zawdnikÃ³w,\ngdy serwujecie',
          'To pokazuje pozycjÄ™ zawdnikÃ³w,\ngdy odbieracie zagrywkÄ™'
        ],
        checkOverlapBtn: 'SprawdÅº',
        noOverlap: 'Brak nakÅ‚adania siÄ™! Ustawienie prawidÅ‚owe.',
        overlapNotApplicable: 'Zasady rotacji obowiÄ…zujÄ… tylko przy przyjÄ™ciu zagrywki.',
        verify: 'Wykryto nakÅ‚adanie siÄ™ - '
      },
      'nl': {
        players: {
          51: { s: 'S', o: 'D', m2: 'M2', m1: 'M1', h1: 'P1', h2: 'P2', l: 'L' },
          '51b': { s: 'S', o: 'D', m2: 'M2', m1: 'M1', h1: 'P1', h2: 'P2', l: 'L' },
          '3M': { s: 'S', o: 'M3', m2: 'P1', m1: 'M1', h1: 'M2', h2: 'P2', l: 'L' },
          63: { s: 'S1', o: 'P2', m2: 'S2', m1: 'P3', h1: 'P1', h2: 'S3', l: 'L' },
          62: { s: 'S1', o: 'S2', m2: 'M2', m1: 'M1', h1: 'P1', h2: 'P2', l: 'L' },
          '62b': { s: 'S1', o: 'S2', m2: 'M2', m1: 'M1', h1: 'P1', h2: 'P2', l: 'L' },
          42: { s: 'S1', o: 'S2', m2: 'M2', m1: 'M1', h1: 'P1', h2: 'P2', l: 'L' }
        },
        rotationControl: {
          51: { serving: 'Serveren', receiving: 'Ontvangen', s1: 'Spelverdeler\nop 1', s2: 'Spelverdeler\nop 2', s3: 'Spelverdeler\nop 3', s4: 'Spelverdeler\nop 4', s5: 'Spelverdeler\nop 5', s6: 'Spelverdeler\nop 6' },
          '51b': { serving: 'Serveren', receiving: 'Ontvangen', s1: 'Spelverdeler\nop 1', s2: 'Spelverdeler\nop 2', s3: 'Spelverdeler\nop 3', s4: 'Spelverdeler\nop 4', s5: 'Spelverdeler\nop 5', s6: 'Spelverdeler\nop 6' },
          '3M': { serving: 'Serveren', receiving: 'Ontvangen', s1: 'Spelverdeler\nop 1', s2: 'Spelverdeler\nop 2', s3: 'Spelverdeler\nop 3', s4: 'Spelverdeler\nop 4', s5: 'Spelverdeler\nop 5', s6: 'Spelverdeler\nop 6' },
          63: { serving: 'Serveren', receiving: 'Ontvangen', s1: 'Spelverdeler\nop 1', s2: 'Spelverdeler\nop 2', s3: 'Spelverdeler\nop 3', s4: 'Spelverdeler\nop 4', s5: 'Spelverdeler\nop 5', s6: 'Spelverdeler\nop 6' },
          62: { serving: 'Serveren', receiving: 'Ontvangen', s1: 'Spelverdeler\nop 1', s2: 'Spelverdeler\nop 2', s3: 'Spelverdeler\nop 3', s4: 'Spelverdeler\nop 4', s5: 'Spelverdeler\nop 5', s6: 'Spelverdeler\nop 6' },
          '62b': { serving: 'Serveren', receiving: 'Ontvangen', s1: 'Spelverdeler\nop 1', s2: 'Spelverdeler\nop 2', s3: 'Spelverdeler\nop 3', s4: 'Spelverdeler\nop 4', s5: 'Spelverdeler\nop 5', s6: 'Spelverdeler\nop 6' },
          42: { serving: 'Serveren', receiving: 'Ontvangen', s1: 'Spelverdeler\nop 1', s2: 'Spelverdeler\nop 2', s3: 'Spelverdeler\nop 3', s4: 'Spelverdeler\nop 4', s5: 'Spelverdeler\nop 5', s6: 'Spelverdeler\nop 6' }
        },
        actionControl: { servingBase: 'Basis', serve: 'Service', set: 'Set', switch: 'Verdediging', pass: 'Pass', attack: 'Aanval' },
        tutorial: [
          'Instructies',
          'Volgende',
          'Dit is een speller. Klik om deze\nte selecteren.\n P=Passer/Loper, M=Midden,\nS=Spelverdeler, D=Diagonal,\nL=Libero',
          'Dit is het veld, met alle 6 de spelers.\nWanneer je op de knoppen drukt\nzullen de spelers zich verplaatsen\nover het veld',
          'Hier kun je de rotaties selecteren.\nKlik op de cirkel om the rotatie te\nveranderen. De positie van de setter\nwordt op de cirkels aangegeven',
          'Deze zijn voor wanneer je serveert',
          'Deze zijn voor wanneer je ontvangt',
          'Verplaatsen van cirkel naar cirkel\nlaat je roteren zoals in een\nwedstrijd',
          'Hier kun je de fase van de rally\nselecteren. De spelers verplaatsen\nzich dan over het veld',
          'Dit laat de positie van de spelers zien\nwanneer jouw kant serveert',
          'Dit laat de positie van de spelers zien\nwanneer jouw kant ontvangt',
        ],
        checkOverlapBtn: 'Controleer',
        noOverlap: 'Geen overlapping waargenomen! Opstelling is correct.',
        overlapNotApplicable: 'Rotatiefouten gelden alleen tijdens serve-ontvangst.',
        verify: 'Waargenomen overlapping - '
      },
      'es': {
        players: {
          51: { s: 'Co', o: 'O', m2: 'C2', m1: 'C1', h1: 'A1', h2: 'A2', l: 'L' },
          '51b': { s: 'Co', o: 'O', m2: 'C2', m1: 'C1', h1: 'A1', h2: 'A2', l: 'L' },
          '3M': { s: 'Co', o: 'C3', m2: 'A1', m1: 'C1', h1: 'C2', h2: 'A2', l: 'L' },
          63: { s: 'Co', o: 'A2', m2: 'Co', m1: 'A3', h1: 'A1', h2: 'Co', l: 'L' },
          62: { s: 'Co', o: 'Co', m2: 'C2', m1: 'C1', h1: 'A1', h2: 'A2', l: 'L' },
          '62b': { s: 'Co', o: 'Co', m2: 'C2', m1: 'C1', h1: 'A1', h2: 'A2', l: 'L' },
          42: { s: 'Co', o: 'Co', m2: 'C2', m1: 'C1', h1: 'A1', h2: 'A2', l: 'L' }
        },
        rotationControl: {
          51: { serving: 'Servicio', receiving: 'RecepciÃ³n', s1: 'Colocador\nen zona 1', s2: 'Colocador\nen zona 2', s3: 'Colocador\nen zona 3', s4: 'Colocador\nen zona 4', s5: 'Colocador\nen zona 5', s6: 'Colocador\nen zona 6' },
          '51b': { serving: 'Servicio', receiving: 'RecepciÃ³n', s1: 'Colocador\nen zona 1', s2: 'Colocador\nen zona 2', s3: 'Colocador\nen zona 3', s4: 'Colocador\nen zona 4', s5: 'Colocador\nen zona 5', s6: 'Colocador\nen zona 6' },
          '3M': { serving: 'Servicio', receiving: 'RecepciÃ³n', s1: 'Colocador\nen zona 1', s2: 'Colocador\nen zona 2', s3: 'Colocador\nen zona 3', s4: 'Colocador\nen zona 4', s5: 'Colocador\nen zona 5', s6: 'Colocador\nen zona 6' },
          63: { serving: 'Servicio', receiving: 'RecepciÃ³n', s1: 'Colocador\nen zona 1', s2: 'Colocador\nen zona 2', s3: 'Colocador\nen zona 3', s4: 'Colocador\nen zona 4', s5: 'Colocador\nen zona 5', s6: 'Colocador\nen zona 6' },
          62: { serving: 'Servicio', receiving: 'RecepciÃ³n', s1: 'Colocador\nen zona 1', s2: 'Colocador\nen zona 2', s3: 'Colocador\nen zona 3', s4: 'Colocador\nen zona 4', s5: 'Colocador\nen zona 5', s6: 'Colocador\nen zona 6' },
          '62b': { serving: 'Servicio', receiving: 'RecepciÃ³n', s1: 'Colocador\nen zona 1', s2: 'Colocador\nen zona 2', s3: 'Colocador\nen zona 3', s4: 'Colocador\nen zona 4', s5: 'Colocador\nen zona 5', s6: 'Colocador\nen zona 6' },
          42: { serving: 'Servicio', receiving: 'RecepciÃ³n', s1: 'Colocador\nen zona 1', s2: 'Colocador\nen zona 2', s3: 'Colocador\nen zona 3', s4: 'Colocador\nen zona 4', s5: 'Colocador\nen zona 5', s6: 'Colocador\nen zona 6' }
        },
        actionControl: { servingBase: 'Base', serve: 'Servicio', set: 'ColocaciÃ³n', switch: 'Defensa', pass: 'Pase', attack: 'Ataque' },
        tutorial: [
          'Tutorial',
          'Siguiente',
          'Esto es un jugador. Haga click para\nseleccionarlo\nA=Atacante, Ce=Central\nCo=Colocadora, O=Opuesta,\nL=Libero',
          'Esta es la cancha de voleibol, con los\n6 jugadores. Los jugadores se\nmoverÃ¡n sobre la cancha al hacer\nclic en los botones del diagrama',
          'Seleccione un cÃ­rculo para mostrar\nuna rotaciÃ³n. Cada rotaciÃ³n estÃ¡\ndesignada por la posiciÃ³n del\ncolocador',
          'Estos son para el servicio',
          'Estos son para la recepciÃ³n',
          'Cambiar de un cÃ­rculo al siguiente\nmuestra las rotaciones como en un\npartido',
          'Seleccione la fase de la jugada para\nmover a los jugadores en la cancha',
          'Estos mostrarÃ¡n las posiciones de los\njugadores cuando su lado estÃ©\nsirviendo',
          'Estos mostrarÃ¡n las posiciones de los\njugadores cuando su lado estÃ©\nrecibiendo'
        ],
        checkOverlapBtn: 'Comprobar',
        noOverlap: 'Â¡Sin superposiciÃ³n! FormaciÃ³n reglamentaria.',
        overlapNotApplicable: 'Las reglas de posiciÃ³n solo aplican durante la recepciÃ³n.',
        verify: 'SuperposiciÃ³n detectada - '
      },
      'pt_br': {
        players: {
          51: { s: 'L', o: 'OP', m2: 'C2', m1: 'C1', h1: 'P1', h2: 'P2', l: 'Li' },
          '51b': { s: 'L', o: 'OP', m2: 'C2', m1: 'C1', h1: 'P1', h2: 'P2', l: 'Li' },
          '3M': { s: 'L', o: 'C3', m2: 'P1', m1: 'C1', h1: 'C2', h2: 'P2', l: 'Li' },
          63: { s: 'L1', o: 'P2', m2: 'L2', m1: 'P3', h1: 'P1', h2: 'L3', l: 'Li' },
          62: { s: 'L1', o: 'L2', m2: 'C2', m1: 'C1', h1: 'P1', h2: 'P2', l: 'Li' },
          '62b': { s: 'L1', o: 'L2', m2: 'C2', m1: 'C1', h1: 'P1', h2: 'P2', l: 'Li' },
          42: { s: 'L1', o: 'L2', m2: 'C2', m1: 'C1', h1: 'P1', h2: 'P2', l: 'Li' }
        },
        rotationControl: {
          51: { serving: 'Sacando', receiving: 'Recebendo', s1: 'Levantador na 1', s2: 'Levantador na 2', s3: 'Levantador na 3', s4: 'Levantador na 4', s5: 'Levantador na 5', s6: 'Levantador na 6' },
          '51b': { serving: 'Sacando', receiving: 'Recebendo', s1: 'Levantador na 1', s2: 'Levantador na 2', s3: 'Levantador na 3', s4: 'Levantador na 4', s5: 'Levantador na 5', s6: 'Levantador na 6' },
          '3M': { serving: 'Sacando', receiving: 'Recebendo', s1: 'Levantador na 1', s2: 'Levantador na 2', s3: 'Levantador na 3', s4: 'Levantador na 4', s5: 'Levantador na 5', s6: 'Levantador na 6' },
          63: { serving: 'Sacando', receiving: 'Recebendo', s1: 'Levantador na 1', s2: 'Levantador na 2', s3: 'Levantador na 3', s4: 'Levantador na 4', s5: 'Levantador na 5', s6: 'Levantador na 6' },
          62: { serving: 'Sacando', receiving: 'Recebendo', s1: 'Levantador na 1', s2: 'Levantador na 2', s3: 'Levantador na 3', s4: 'Levantador na 4', s5: 'Levantador na 5', s6: 'Levantador na 6' },
          '62b': { serving: 'Sacando', receiving: 'Recebendo', s1: 'Levantador na 1', s2: 'Levantador na 2', s3: 'Levantador na 3', s4: 'Levantador na 4', s5: 'Levantador na 5', s6: 'Levantador na 6' },
          42: { serving: 'Sacando', receiving: 'Recebendo', s1: 'Levantador na 1', s2: 'Levantador na 2', s3: 'Levantador na 3', s4: 'Levantador na 4', s5: 'Levantador na 5', s6: 'Levantador na 6' }
        },
        actionControl: { servingBase: 'Base', serve: 'Saque', set: 'Levantamento', switch: 'Defesa', pass: 'Passe', attack: 'Ataque' },
        tutorial: [
          'Tutorial',
          'PrÃ³ximo',
          'Este Ã© o jogador. Clique para destacÃ¡-lo.\n\nP=Ponta, C=Central, L=Levantador,\nOP=Oposto, Li=Libero',
          'Esta Ã© a quadra, com os 6 jogadores.\nClique nos botÃµes, e os jogadores\n se moverÃ£o pela quadra.',
          'Este quadro permite selecionar as\n rotaÃ§Ãµes.Clique nos circulos para\n mudar a rotaÃ§Ã£o.\n Eles estÃ£o marcadas pela posiÃ§Ã£o doThese show the player positionsThese show the player positionsThese show the player positions\n levantador.',
          'Estes sÃ£o para quando vocÃª esta \nsacando',
          'Estes sÃ£o para quando vocÃª esta \n recebendo.',
          'Mover de circulo a circulo faz\n vocÃª rotacionar como em um jogo.',
          'Este painel permite que vocÃª\n selecione a fase do rally.\n Os jogadores moverÃ£o pela quadra.',
          'Essas sÃ£o as posiÃ§Ãµes\n quando seu time estÃ¡ sacando.',
          'Essas sÃ£o as posiÃ§Ãµes\n quando o seu time estÃ¡ recebendo.',
        ],
        checkOverlapBtn: 'Verificar',
        noOverlap: 'Nenhuma sobreposiÃ§Ã£o detectada! PosiÃ§Ã£o correta.',
        overlapNotApplicable: 'As regras de posicionamento sÃ³ se aplicam na recepÃ§Ã£o.',
        verify: 'SobreposiÃ§Ã£o detectada - '
      },
      'vn': {
        players: {
          51: { s: 'S', o: 'OP', m2: 'M2', m1: 'M1', h1: 'H1', h2: 'H2', l: 'L' },
          '51b': { s: 'S', o: 'OP', m2: 'M2', m1: 'M1', h1: 'H1', h2: 'H2', l: 'L' },
          '3M': { s: 'S', o: 'M3', m2: 'H1', m1: 'M1', h1: 'M2', h2: 'H2', l: 'L' },
          63: { s: 'S1', o: 'H2', m2: 'S2', m1: 'H3', h1: 'H1', h2: 'S3', l: 'L' },
          62: { s: 'S1', o: 'S2', m2: 'M2', m1: 'M1', h1: 'H1', h2: 'H2', l: 'L' },
          '62b': { s: 'S1', o: 'S2', m2: 'M2', m1: 'M1', h1: 'H1', h2: 'H2', l: 'L' },
          42: { s: 'S1', o: 'S2', m2: 'M2', m1: 'M1', h1: 'H1', h2: 'H2', l: 'L' }
        },
        rotationControl: {
          51: { serving: 'Giao bÃ³ng', receiving: 'Nháº­n bÃ³ng', s1: 'setter á»Ÿ vÃ¹ng 1', s2: 'setter á»Ÿ vÃ¹ng 2', s3: 'setter á»Ÿ vÃ¹ng 3', s4: 'setter á»Ÿ vÃ¹ng 4', s5: 'setter á»Ÿ vÃ¹ng 5', s6: 'setter á»Ÿ vÃ¹ng 6' },
          '51b': { serving: 'Giao bÃ³ng', receiving: 'Nháº­n bÃ³ng', s1: 'setter á»Ÿ vÃ¹ng 1', s2: 'setter á»Ÿ vÃ¹ng 2', s3: 'setter á»Ÿ vÃ¹ng 3', s4: 'setter á»Ÿ vÃ¹ng 4', s5: 'setter á»Ÿ vÃ¹ng 5', s6: 'setter á»Ÿ vÃ¹ng 6' },
          '3M': { serving: 'Giao bÃ³ng', receiving: 'Nháº­n bÃ³ng', s1: 'setter á»Ÿ vÃ¹ng 1', s2: 'setter á»Ÿ vÃ¹ng 2', s3: 'setter á»Ÿ vÃ¹ng 3', s4: 'setter á»Ÿ vÃ¹ng 4', s5: 'setter á»Ÿ vÃ¹ng 5', s6: 'setter á»Ÿ vÃ¹ng 6' },
          63: { serving: 'Giao bÃ³ng', receiving: 'Nháº­n bÃ³ng', s1: 'setter á»Ÿ vÃ¹ng 1', s2: 'setter á»Ÿ vÃ¹ng 2', s3: 'setter á»Ÿ vÃ¹ng 3', s4: 'setter á»Ÿ vÃ¹ng 4', s5: 'setter á»Ÿ vÃ¹ng 5', s6: 'setter á»Ÿ vÃ¹ng 6' },
          62: { serving: 'Giao bÃ³ng', receiving: 'Nháº­n bÃ³ng', s1: 'setter á»Ÿ vÃ¹ng 1', s2: 'setter á»Ÿ vÃ¹ng 2', s3: 'setter á»Ÿ vÃ¹ng 3', s4: 'setter á»Ÿ vÃ¹ng 4', s5: 'setter á»Ÿ vÃ¹ng 5', s6: 'setter á»Ÿ vÃ¹ng 6' },
          '62b': { serving: 'Giao bÃ³ng', receiving: 'Nháº­n bÃ³ng', s1: 'setter á»Ÿ vÃ¹ng 1', s2: 'setter á»Ÿ vÃ¹ng 2', s3: 'setter á»Ÿ vÃ¹ng 3', s4: 'setter á»Ÿ vÃ¹ng 4', s5: 'setter á»Ÿ vÃ¹ng 5', s6: 'setter á»Ÿ vÃ¹ng 6' },
          42: { serving: 'Giao bÃ³ng', receiving: 'Nháº­n bÃ³ng', s1: 'setter á»Ÿ vÃ¹ng 1', s2: 'setter á»Ÿ vÃ¹ng 2', s3: 'setter á»Ÿ vÃ¹ng 3', s4: 'setter á»Ÿ vÃ¹ng 4', s5: 'setter á»Ÿ vÃ¹ng 5', s6: 'setter á»Ÿ vÃ¹ng 6' }
        },
        actionControl: { servingBase: 'NÆ¡i', serve: 'phÃ¡t bÃ³ng', set: 'Ä‘áº·t bÃ³ng', switch: 'chá»— thá»§', pass: 'tiáº¿p bÃ³ng', attack: 'táº¥n cÃ´ng' },
        tutorial: [
          'HÆ°á»›ng dáº«n',
          'tiáº¿p theo',
          'ÄÃ¢y lÃ  má»™t cáº§u thá»§. Báº¥m Ä‘á»ƒ lÃ m \nná»•i báº­t.\n\nP=Ponta, C=Central, L=Levantador,\nOP=Oposto, Li=Libero',
          'Báº¡n cÃ³ thá»ƒ di chuyá»ƒn cÃ¡c cáº§u thá»§ trÃªn \nsÃ¢n thá»§ cÃ´ng hoáº·c sá»­ dá»¥ng tÃ­nh nÄƒng \ntÆ°Æ¡ng tÃ¡c Ä‘á»ƒ Ä‘áº·t cÃ¡c cáº§u thá»§ vÃ o vá»‹ trÃ­ \ntÆ°Æ¡ng á»©ng cá»§a há» tá»± Ä‘á»™ng.',
          'Äiá»u nÃ y cho phÃ©p báº¡n chá»n cÃ¡c chu \nká»³ quay vÃ²ng. Nháº¥n vÃ o hÃ¬nh trÃ²n \nÄ‘á»ƒ thay Ä‘á»•i chu ká»³ quay vÃ²ng. Má»—i \nchu ká»³ Ä‘Æ°á»£c gáº¯n nhÃ£n vá»›i vá»‹ trÃ­ cá»§a \nngÆ°á»i Ä‘iá»u khiá»ƒn bÃ³ng.',
          'ÄÃ¢y lÃ  Ä‘á»ƒ sá»­ dá»¥ng khi báº¡n Ä‘ang \nphÃ¡t bÃ³ng.',
          'ÄÃ¢y lÃ  Ä‘á»ƒ sá»­ dá»¥ng khi báº¡n Ä‘ang \ntiáº¿p bÃ³ng.',
          'Di chuyá»ƒn tá»« vÃ²ng nÃ y sang vÃ²ng \nkhÃ¡c sáº½ lÃ m cho báº¡n xoay vÃ²ng nhÆ° \ntrong má»™t tráº­n Ä‘áº¥u thá»±c táº¿.',
          'Äiá»u nÃ y cho phÃ©p báº¡n chá»n giai \nÄ‘oáº¡n cá»§a cuá»™c Ä‘áº¥u. Sau Ä‘Ã³, cÃ¡c cáº§u \nthá»§ sáº½ di chuyá»ƒn trÃªn sÃ¢n.',
          'ÄÃ¢y lÃ  nhá»¯ng thá»ƒ hiá»‡n vá»‹ trÃ­ cá»§a \ncÃ¡c cáº§u thá»§ khi Ä‘á»™i cá»§a báº¡n Ä‘ang \nphÃ¡t bÃ³ng.',
          'ÄÃ¢y lÃ  nhá»¯ng thá»ƒ hiá»‡n vá»‹ trÃ­ cá»§a \ncÃ¡c cáº§u thá»§ khi Ä‘á»™i cá»§a báº¡n Ä‘ang \ntiáº¿p bÃ³ng.',
        ],
        checkOverlapBtn: 'Kiá»ƒm tra',
        noOverlap: 'KhÃ´ng cÃ³ lá»—i vá»‹ trÃ­! Äá»™i hÃ¬nh há»£p lá»‡.',
        overlapNotApplicable: 'Lá»—i vá»‹ trÃ­ chá»‰ tÃ­nh trong giai Ä‘oáº¡n Ä‘Ã³n bÃ³ng.',
        verify: 'Chá»“ng chÃ©o vá»‹ trÃ­ - '
      },
    }

    this.language = (typeof config.language === 'string' && Object.keys(this.text).includes(config.language)) ? config.language : 'en'
    this.system = config.rotationalSystem;

    this.tutorialData = [
      {
        boxPosition: {
          left: 450 * this.svg.scale,
          right: 650 * this.svg.scale,
          top: 700 * this.svg.scale,
          bottom: 890 * this.svg.scale,
        },
        textPosition: {
          left: 700 * this.svg.scale,
          right: 1320 * this.svg.scale,
          top: 700 * this.svg.scale,
          bottom: 920 * this.svg.scale,
        },
        text: this.text[this.language].tutorial[2],
        nextPosition: {
          left: 1080 * this.svg.scale,
          top: 950 * this.svg.scale,
        },
      },
      {
        boxPosition: {
          left: 112 * this.svg.scale,
          right: 988 * this.svg.scale,
          top: 112 * this.svg.scale,
          bottom: 986 * this.svg.scale,
        },
        textPosition: {
          left: 1050 * this.svg.scale,
          right: 1670 * this.svg.scale,
          top: 400 * this.svg.scale,
          bottom: 600 * this.svg.scale,
        },
        text: this.text[this.language].tutorial[3],
        nextPosition: {
          left: 1430 * this.svg.scale,
          top: 650 * this.svg.scale,
        },
      },
      {
        boxPosition: {
          left: 1150 * this.svg.scale,
          right: 1690 * this.svg.scale,
          top: 50 * this.svg.scale,
          bottom: 1070 * this.svg.scale,
        },
        textPosition: {
          left: 480 * this.svg.scale,
          right: 1100 * this.svg.scale,
          top: 50 * this.svg.scale,
          bottom: 270 * this.svg.scale,
        },
        text: this.text[this.language].tutorial[4],
        nextPosition: {
          left: 860 * this.svg.scale,
          top: 300 * this.svg.scale,
        },
      },
      {
        boxPosition: {
          left: 1150 * this.svg.scale,
          right: 1330 * this.svg.scale,
          top: 50 * this.svg.scale,
          bottom: 1070 * this.svg.scale,
        },
        textPosition: {
          left: 480 * this.svg.scale,
          right: 1100 * this.svg.scale,
          top: 150 * this.svg.scale,
          bottom: 350 * this.svg.scale,
        },
        text: this.text[this.language].tutorial[5],
        nextPosition: {
          left: 860 * this.svg.scale,
          top: 400 * this.svg.scale,
        },
      },
      {
        boxPosition: {
          left: 1330 * this.svg.scale,
          right: 1510 * this.svg.scale,
          top: 50 * this.svg.scale,
          bottom: 1070 * this.svg.scale,
        },
        textPosition: {
          left: 480 * this.svg.scale,
          right: 1100 * this.svg.scale,
          top: 250 * this.svg.scale,
          bottom: 450 * this.svg.scale,
        },
        text: this.text[this.language].tutorial[6],
        nextPosition: {
          left: 860 * this.svg.scale,
          top: 500 * this.svg.scale,
        },
      },
      {
        boxPosition: {
          left: 1150 * this.svg.scale,
          right: 1510 * this.svg.scale,
          top: 50 * this.svg.scale,
          bottom: 1070 * this.svg.scale,
        },
        textPosition: {
          left: 480 * this.svg.scale,
          right: 1100 * this.svg.scale,
          top: 350 * this.svg.scale,
          bottom: 550 * this.svg.scale,
        },
        text: this.text[this.language].tutorial[7],
        nextPosition: {
          left: 860 * this.svg.scale,
          top: 600 * this.svg.scale,
        },
      },
      {
        boxPosition: {
          left: 10 * this.svg.scale,
          right: 1110 * this.svg.scale,
          top: 1120 * this.svg.scale,
          bottom: 1570 * this.svg.scale,
        },
        textPosition: {
          left: 90 * this.svg.scale,
          right: 710 * this.svg.scale,
          top: 880 * this.svg.scale,
          bottom: 1080 * this.svg.scale,
        },
        text: this.text[this.language].tutorial[8],
        nextPosition: {
          left: 760 * this.svg.scale,
          top: 1000 * this.svg.scale,
        },
      },
      {
        boxPosition: {
          left: 10 * this.svg.scale,
          right: 1110 * this.svg.scale,
          top: 1120 * this.svg.scale,
          bottom: 1334 * this.svg.scale,
        },
        textPosition: {
          left: 140 * this.svg.scale,
          right: 760 * this.svg.scale,
          top: 880 * this.svg.scale,
          bottom: 1080 * this.svg.scale,
        },
        text: this.text[this.language].tutorial[9],
        nextPosition: {
          left: 810 * this.svg.scale,
          top: 1000 * this.svg.scale,
        },
      },
      {
        boxPosition: {
          left: 10 * this.svg.scale,
          right: 1110 * this.svg.scale,
          top: 1336 * this.svg.scale,
          bottom: 1570 * this.svg.scale,
        },
        textPosition: {
          left: 190 * this.svg.scale,
          right: 810 * this.svg.scale,
          top: 880 * this.svg.scale,
          bottom: 1080 * this.svg.scale,
        },
        text: this.text[this.language].tutorial[10],
        nextPosition: {
          left: 860 * this.svg.scale,
          top: 1000 * this.svg.scale,
        },
      },
    ]

    this.court = new VBHalfCourt({
      width: (11 / 17) * this.svg.width
    })

    this.court.allowedDragging = true;

    this.svg.snapRoot.append(this.court.getSVG())
    //this.court.getSVG().setAttribute('transform', 't100,0')

    this.playerPositions = {
      servingBase: {
        51: {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        '51b': {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        '3M': {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: -64, y: 700 },
            m1: { x: 450, y: 700 }
          },
          2: {
            m1: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            o: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 450, y: 700 },
            o: { x: -64, y: 700 },
            m2: { x: 200, y: 600 }
          },
          4: {
            o: { x: -64, y: 700 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 700, y: 600 },
            m2: { x: 450, y: 700 }
          },
          5: {
            m2: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            h1: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: -64, y: 700 },
            s: { x: 450, y: 700 },
            m1: { x: 200, y: 600 }
          }
        },
        63: {  //s2<-m2; h2<-O;s3<-h2; h3<-m1
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            m1: { x: -64, y: 700 },
            l: { x: 450, y: 700 }
          },
          2: {
            m1: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            o: { x: 450, y: 700 },
            l: { x: -64, y: 700 },
            m2: { x: 200, y: 600 }
          },
          4: {
            l: { x: -64, y: 700 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            o: { x: 700, y: 600 },
            m2: { x: 450, y: 700 }
          },
          5: {
            m2: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            m1: { x: -64, y: 700 },
            s: { x: 450, y: 700 },
            l: { x: 200, y: 600 }
          }
        },
        62: {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        '62b': {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        42: {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        }

      },
      servingServe: {
        51: {
          1: {
            s: { x: 700, y: 940 },
            h1: { x: 580, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 320, y: 60 },
            h2: { x: 200, y: 400 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 700, y: 940 },
            s: { x: 580, y: 60 },
            h1: { x: 450, y: 60 },
            m2: { x: 320, y: 60 },
            o: { x: 200, y: 400 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 940 },
            m1: { x: 580, y: 60 },
            s: { x: 450, y: 60 },
            h1: { x: 320, y: 60 },
            l: { x: 200, y: 400 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 940 },
            h2: { x: 580, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 320, y: 60 },
            h1: { x: 200, y: 400 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 700, y: 940 },
            o: { x: 580, y: 60 },
            h2: { x: 450, y: 60 },
            m1: { x: 320, y: 60 },
            s: { x: 200, y: 400 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 940 },
            m2: { x: 580, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 320, y: 60 },
            l: { x: 200, y: 400 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        '51b': {
          1: {
            s: { x: 700, y: 940 },
            h1: { x: 580, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 320, y: 60 },
            h2: { x: 200, y: 350 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 700, y: 940 },
            s: { x: 580, y: 60 },
            h1: { x: 450, y: 60 },
            m2: { x: 320, y: 60 },
            o: { x: 200, y: 400 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 940 },
            m1: { x: 580, y: 60 },
            s: { x: 450, y: 60 },
            h1: { x: 320, y: 60 },
            l: { x: 200, y: 400 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 940 },
            h2: { x: 580, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 320, y: 60 },
            h1: { x: 200, y: 400 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 700, y: 940 },
            o: { x: 580, y: 60 },
            h2: { x: 450, y: 60 },
            m1: { x: 320, y: 60 },
            s: { x: 200, y: 400 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 940 },
            m2: { x: 580, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 320, y: 60 },
            l: { x: 200, y: 400 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        '3M': { //m2<-h1; m3<-O;h1<-m2;
          1: {
            s: { x: 700, y: 940 },
            h1: { x: 580, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 320, y: 60 },
            h2: { x: 400, y: 700 },
            l: { x: -64, y: 700 },
            m1: { x: 450, y: 400 }
          },
          2: {
            m1: { x: 700, y: 940 },
            s: { x: 580, y: 60 },
            h1: { x: 450, y: 60 },
            m2: { x: 320, y: 60 },
            o: { x: -64, y: 700 },
            h2: { x: 450, y: 700 },
            l: { x: 200, y: 400 }
          },
          3: {
            h2: { x: 700, y: 940 },
            m1: { x: 580, y: 60 },
            s: { x: 450, y: 60 },
            h1: { x: 320, y: 60 },
            l: { x: 450, y: 700 },
            o: { x: -64, y: 700 },
            m2: { x: 200, y: 400 }
          },
          4: {
            o: { x: -64, y: 700 },
            h2: { x: 580, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 320, y: 60 },
            h1: { x: 400, y: 400 },
            l: { x: 700, y: 940 },
            m2: { x: 450, y: 700 }
          },
          5: {
            m2: { x: 700, y: 940 },
            o: { x: 580, y: 60 },
            h2: { x: 450, y: 60 },
            m1: { x: 320, y: 60 },
            s: { x: 400, y: 400 },
            l: { x: 450, y: 700 },
            h1: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 940 },
            m2: { x: 580, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 320, y: 60 },
            l: { x: -64, y: 700 },
            s: { x: 600, y: 400 },
            m1: { x: 200, y: 400 }
          }
        },
        63: { //s2<-m2; h2<-O;s3<-h2; h3<-m1
          1: {
            s: { x: 700, y: 940 },
            h1: { x: 580, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 320, y: 60 },
            h2: { x: 400, y: 700 },
            m1: { x: -64, y: 700 },
            l: { x: 450, y: 400 }
          },
          2: {
            l: { x: 700, y: 940 },
            s: { x: 580, y: 60 },
            h1: { x: 450, y: 60 },
            m2: { x: 320, y: 60 },
            m1: { x: -64, y: 700 },
            h2: { x: 700, y: 400 },
            o: { x: 450, y: 600 }
          },
          3: {
            h2: { x: 700, y: 940 },
            m1: { x: 580, y: 60 },
            s: { x: 450, y: 60 },
            h1: { x: 320, y: 60 },
            o: { x: 450, y: 700 },
            l: { x: -64, y: 700 },
            m2: { x: 200, y: 400 }
          },
          4: {
            l: { x: -64, y: 700 },
            h2: { x: 580, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 320, y: 60 },
            h1: { x: 200, y: 400 },
            o: { x: 700, y: 940 },
            m2: { x: 700, y: 400 }
          },
          5: {
            m2: { x: 700, y: 940 },
            o: { x: 580, y: 60 },
            h2: { x: 450, y: 60 },
            m1: { x: 320, y: 60 },
            s: { x: 400, y: 400 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 940 },
            m2: { x: 580, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 320, y: 60 },
            m1: { x: -64, y: 700 },
            s: { x: 600, y: 400 },
            l: { x: 200, y: 400 }
          }
        },
        62: {
          1: {
            s: { x: 700, y: 940 },
            h1: { x: 580, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 320, y: 60 },
            h2: { x: 200, y: 400 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 700, y: 940 },
            s: { x: 580, y: 60 },
            h1: { x: 450, y: 60 },
            m2: { x: 320, y: 60 },
            o: { x: 200, y: 400 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 940 },
            m1: { x: 580, y: 60 },
            s: { x: 450, y: 60 },
            h1: { x: 320, y: 60 },
            l: { x: 200, y: 400 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 940 },
            h2: { x: 580, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 320, y: 60 },
            h1: { x: 200, y: 400 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 700, y: 940 },
            o: { x: 580, y: 60 },
            h2: { x: 450, y: 60 },
            m1: { x: 320, y: 60 },
            s: { x: 200, y: 400 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 940 },
            m2: { x: 580, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 320, y: 60 },
            l: { x: 200, y: 400 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        '62b': {
          1: {
            s: { x: 700, y: 940 },
            h1: { x: 580, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 320, y: 60 },
            h2: { x: 200, y: 400 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 940 },
            s: { x: 580, y: 60 },
            h1: { x: 450, y: 60 },
            m2: { x: 320, y: 60 },
            o: { x: 400, y: 400 },
            h2: { x: 450, y: 500 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 940 },
            m1: { x: 580, y: 60 },
            s: { x: 450, y: 60 },
            h1: { x: 320, y: 60 },
            l: { x: 200, y: 400 },
            o: { x: 700, y: 400 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 940 },
            h2: { x: 580, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 320, y: 60 },
            h1: { x: 200, y: 700 },
            l: { x: 450, y: 400 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 940 },
            o: { x: 580, y: 60 },
            h2: { x: 450, y: 60 },
            m1: { x: 320, y: 60 },
            s: { x: 200, y: 400 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 940 },
            m2: { x: 580, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 320, y: 60 },
            l: { x: 200, y: 400 },
            s: { x: 700, y: 400 },
            m1: { x: -64, y: 700 }
          }
        },
        42: {
          1: {
            s: { x: 700, y: 940 },
            h1: { x: 580, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 320, y: 60 },
            h2: { x: 200, y: 400 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 700, y: 940 },
            s: { x: 580, y: 60 },
            h1: { x: 450, y: 60 },
            m2: { x: 320, y: 60 },
            o: { x: 400, y: 400 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 940 },
            m1: { x: 580, y: 60 },
            s: { x: 450, y: 60 },
            h1: { x: 320, y: 60 },
            l: { x: 450, y: 700 },
            o: { x: 500, y: 400 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 940 },
            h2: { x: 580, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 320, y: 60 },
            h1: { x: 200, y: 400 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 700, y: 940 },
            o: { x: 580, y: 60 },
            h2: { x: 450, y: 60 },
            m1: { x: 320, y: 60 },
            s: { x: 400, y: 400 },
            h1: { x: 450, y: 600 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 940 },
            m2: { x: 580, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 320, y: 60 },
            l: { x: 400, y: 700 },
            s: { x: 450, y: 400 },
            m1: { x: -64, y: 700 }
          }
        }
      },
      servingSwitch: {
        51: {
          1: {
            s: { x: 700, y: 400 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 450, y: 700 },
            l: { x: 200, y: 400 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 200, y: 400 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 400 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 700 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            l: { x: 200, y: 400 },
            o: { x: 700, y: 400 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 400 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 450, y: 700 },
            l: { x: 200, y: 400 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 200, y: 400 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 400 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 700 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            l: { x: 200, y: 400 },
            s: { x: 700, y: 400 },
            m1: { x: -64, y: 700 }
          }
        },
        '51b': {
          1: {
            s: { x: 700, y: 350 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 450, y: 700 },
            l: { x: 200, y: 350 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 200, y: 350 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 350 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 700 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            l: { x: 200, y: 350 },
            o: { x: 700, y: 350 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 350 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 450, y: 700 },
            l: { x: 200, y: 350 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 200, y: 350 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 350 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 700 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            l: { x: 200, y: 350 },
            s: { x: 700, y: 350 },
            m1: { x: -64, y: 700 }
          }
        },
        '3M': { //m2<-h1; m3<-O;h1<-m2;
          1: {
            s: { x: 700, y: 400 },
            h1: { x: 450, y: 60 },
            m2: { x: 150, y: 60 },
            o: { x: 750, y: 60 },
            m1: { x: 200, y: 400 },
            l: { x: -64, y: 700 },
            h2: { x: 450, y: 700 }
          },
          2: {
            m1: { x: 700, y: 400 },
            s: { x: 700, y: 60 },
            h1: { x: 450, y: 60 },
            m2: { x: 200, y: 60 },
            o: { x: -64, y: 700 },
            h2: { x: 450, y: 700 },
            l: { x: 200, y: 400 }
          },
          3: {
            h2: { x: 450, y: 700 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            l: { x: 200, y: 400 },
            o: { x: -64, y: 700 },
            m2: { x: 700, y: 400 }
          },
          4: {
            o: { x: -64, y: 700 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            m2: { x: 700, y: 400 },
            l: { x: 200, y: 400 },
            h1: { x: 450, y: 700 }
          },
          5: {
            l: { x: 200, y: 400 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 400 },
            m2: { x: 450, y: 700 },
            h1: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 700 },
            h2: { x: 700, y: 60 },
            o: { x: 450, y: 60 },
            m2: { x: 200, y: 60 },
            l: { x: -64, y: 700 },
            s: { x: 700, y: 400 },
            m1: { x: 200, y: 400 }
          }
        },
        63: { //s2<-m2; h2<-O;s3<-h2; h3<-m1
          1: {
            s: { x: 700, y: 400 },
            h1: { x: 450, y: 60 },
            m2: { x: 150, y: 60 },
            o: { x: 750, y: 60 },
            l: { x: 200, y: 400 },
            m1: { x: -64, y: 700 },
            h2: { x: 450, y: 700 }
          },
          2: {
            o: { x: 450, y: 700 },
            s: { x: 700, y: 60 },
            h1: { x: 450, y: 60 },
            m2: { x: 200, y: 60 },
            m1: { x: -64, y: 700 },
            h2: { x: 700, y: 400 },
            l: { x: 200, y: 400 }
          },
          3: {
            o: { x: 450, y: 700 },
            h1: { x: 450, y: 60 },
            m1: { x: 700, y: 60 },
            s: { x: 200, y: 60 },
            m2: { x: 200, y: 400 },
            l: { x: -64, y: 700 },
            h2: { x: 700, y: 400 }
          },
          4: {
            l: { x: -64, y: 700 },
            s: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            h2: { x: 700, y: 60 },
            m2: { x: 700, y: 400 },
            h1: { x: 200, y: 400 },
            o: { x: 450, y: 700 }
          },
          5: {
            s: { x: 200, y: 400 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            m2: { x: 700, y: 400 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 700 },
            m2: { x: 700, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: -64, y: 700 },
            s: { x: 700, y: 400 },
            l: { x: 200, y: 400 }
          }
        },
        62: {
          1: {
            s: { x: 700, y: 400 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 450, y: 700 },
            l: { x: 200, y: 400 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 200, y: 400 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 400 },
            h2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 700 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            l: { x: 200, y: 400 },
            o: { x: 700, y: 400 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 400 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 450, y: 700 },
            l: { x: 200, y: 400 },
            m2: { x: -64, y: 700 }
          },
          5: {
            m2: { x: 200, y: 400 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 400 },
            h1: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 700 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            l: { x: 200, y: 400 },
            s: { x: 700, y: 400 },
            m1: { x: -64, y: 700 }
          }
        },
        '62b': {
          1: {
            s: { x: 700, y: 350 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            l: { x: 450, y: 700 },
            h2: { x: 200, y: 350 },
            m1: { x: -64, y: 700 }
          },
          2: {
            h2: { x: 200, y: 350 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 350 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 700 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            l: { x: 200, y: 350 },
            o: { x: 700, y: 350 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 350 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 450, y: 700 },
            l: { x: 200, y: 350 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 200, y: 350 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 350 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 700 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            l: { x: 200, y: 350 },
            s: { x: 700, y: 350 },
            m1: { x: -64, y: 700 }
          }
        },
        42: {
          1: {
            s: { x: 700, y: 400 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            l: { x: 450, y: 700 },
            h2: { x: 200, y: 400 },
            m1: { x: -64, y: 700 }
          },
          2: {
            m1: { x: 450, y: 700 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 400 },
            h2: { x: 200, y: 400 },
            l: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 200, y: 400 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            l: { x: 450, y: 700 },
            o: { x: 700, y: 400 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 400 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 400 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            h1: { x: 200, y: 400 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 400 },
            m2: { x: 450, y: 700 },
            l: { x: -64, y: 700 }
          },
          6: {
            l: { x: 450, y: 700 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            h1: { x: 200, y: 400 },
            s: { x: 700, y: 400 },
            m1: { x: -64, y: 700 }
          }
        },
      },
      receivingBase: {
        51: {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        '51b': {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        '3M': {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: -64, y: 700 },
            m1: { x: 450, y: 700 }
          },
          2: {
            l: { x: 200, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: -64, y: 700 },
            h2: { x: 450, y: 700 },
            m1: { x: 700, y: 600 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 450, y: 700 },
            o: { x: -64, y: 700 },
            m2: { x: 200, y: 600 }
          },
          4: {
            o: { x: -64, y: 700 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 700, y: 600 },
            m2: { x: 450, y: 700 }
          },
          5: {
            l: { x: -64, y: 700 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            m2: { x: 700, y: 600 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: -64, y: 700 },
            s: { x: 450, y: 700 },
            m1: { x: 200, y: 600 }
          }
        },
        63: { //s2<-m2; h2<-O;s3<-h2; h3<-m1
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            m1: { x: -64, y: 700 },
            l: { x: 450, y: 700 }
          },
          2: {
            o: { x: 200, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            m1: { x: -64, y: 700 },
            h2: { x: 450, y: 700 },
            l: { x: 700, y: 600 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            o: { x: 450, y: 700 },
            l: { x: -64, y: 700 },
            m2: { x: 200, y: 600 }
          },
          4: {
            l: { x: -64, y: 700 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            o: { x: 700, y: 600 },
            m2: { x: 450, y: 700 }
          },
          5: {
            l: { x: -64, y: 700 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            m2: { x: 700, y: 600 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            m1: { x: -64, y: 700 },
            s: { x: 450, y: 700 },
            l: { x: 200, y: 600 }
          }
        },
        62: {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        '62b': {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
        42: {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 700, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 100 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 700, y: 100 },
            s: { x: 450, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            o: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 700, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 200, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 600 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 100 },
            m1: { x: 200, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            m2: { x: 700, y: 100 },
            o: { x: 450, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 600 },
            s: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          }
        },
      },
      receivingPass: {
        51: {
          1: {
            s: { x: 840, y: 700 },
            l: { x: 700, y: 650 },
            m2: { x: 150, y: 100 },
            o: { x: 54, y: 60 },
            h1: { x: 200, y: 600 },
            h2: { x: 450, y: 650 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 650 },
            s: { x: 700, y: 100 },
            h1: { x: 200, y: 600 },
            m2: { x: 40, y: 60 },
            o: { x: 260, y: 840 },
            h2: { x: 450, y: 650 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 650 },
            m1: { x: 700, y: 40 },
            s: { x: 600, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 650 },
            o: { x: 600, y: 840 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 860, y: 860 },
            h2: { x: 200, y: 600 },
            m1: { x: 140, y: 140 },
            s: { x: 60, y: 60 },
            h1: { x: 450, y: 650 },
            l: { x: 700, y: 650 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 650 },
            o: { x: 840, y: 100 },
            h2: { x: 200, y: 600 },
            m1: { x: 60, y: 60 },
            s: { x: 350, y: 140 },
            h1: { x: 450, y: 650 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 650 },
            m2: { x: 640, y: 140 },
            o: { x: 560, y: 60 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 650 },
            s: { x: 510, y: 170 },
            m1: { x: -64, y: 700 }
          }
        },
        '51b': {
          1: {
            s: { x: 840, y: 200 },
            l: { x: 700, y: 650 },
            m2: { x: 200, y: 100 },
            o: { x: 150, y: 600 },
            h1: { x: 840, y: 60 },
            h2: { x: 450, y: 650 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 650 },
            s: { x: 700, y: 60 },
            h1: { x: 100, y: 250 },
            m2: { x: 40, y: 60 },
            o: { x: 200, y: 650 },
            h2: { x: 450, y: 650 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 650 },
            m1: { x: 850, y: 250 },
            s: { x: 670, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 650 },
            o: { x: 680, y: 850 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 650 },
            h2: { x: 420, y: 200 },
            m1: { x: 400, y: 40 },
            s: { x: 350, y: 100 },
            h1: { x: 200, y: 650 },
            l: { x: 450, y: 650 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 650 },
            o: { x: 840, y: 250 },
            h2: { x: 200, y: 600 },
            m1: { x: 60, y: 60 },
            s: { x: 350, y: 140 },
            h1: { x: 450, y: 650 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 650 },
            m2: { x: 850, y: 250 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 650 },
            s: { x: 550, y: 150 },
            m1: { x: -64, y: 700 }
          }
        },
        '3M': {  //m2<-h1; m3<-O;h1<-m2;
          1: {
            s: { x: 800, y: 200 },
            h1: { x: 850, y: 80 },
            m2: { x: 250, y: 650 },
            o: { x: 100, y: 50 },
            h2: { x: 450, y: 850 },
            l: { x: -64, y: 700 },
            m1: { x: 650, y: 700 }
          },
          2: {
            l: { x: 300, y: 850 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 250, y: 700 },
            o: { x: -64, y: 700 },
            h2: { x: 600, y: 850 },
            m1: { x: 650, y: 700 }
          },
          3: {
            h2: { x: 850, y: 850 },
            m1: { x: 650, y: 700 },
            s: { x: 650, y: 80 },
            h1: { x: 80, y: 300 },
            l: { x: 450, y: 850 },
            o: { x: -64, y: 700 },
            m2: { x: 250, y: 700 }
          },
          4: {
            o: { x: -64, y: 700 },
            h2: { x: 270, y: 250 },
            m1: { x: 250, y: 650 },
            s: { x: 200, y: 60 },
            h1: { x: 50, y: 850 },
            l: { x: 850, y: 850 },
            m2: { x: 650, y: 650 }
          },
          5: {
            l: { x: -64, y: 700 },
            o: { x: 840, y: 100 },
            h2: { x: 200, y: 600 },
            m1: { x: 60, y: 60 },
            s: { x: 350, y: 140 },
            h1: { x: 450, y: 850 },
            m2: { x: 700, y: 600 }
          },
          6: {
            h1: { x: 850, y: 850 },
            m2: { x: 250, y: 700 },
            o: { x: 100, y: 60 },
            h2: { x: 40, y: 680 },
            l: { x: -64, y: 700 },
            s: { x: 700, y: 150 },
            m1: { x: 650, y: 700 }
          }
        },
        63: {  //s2<-m2; h2<-O;s3<-h2; h3<-m1
          1: {
            s: { x: 720, y: 200 },
            h1: { x: 850, y: 80 },
            m2: { x: 200, y: 650 },
            o: { x: 50, y: 50 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 },
            l: { x: 700, y: 700 }
          },
          2: {
            l: { x: 700, y: 650 },
            s: { x: 700, y: 100 },
            h1: { x: 300, y: 50 },
            m2: { x: 200, y: 650 },
            m1: { x: -64, y: 700 },
            h2: { x: 450, y: 650 },
            o: { x: 50, y: 850 }
          },
          3: {
            h2: { x: 720, y: 200 },
            m1: { x: 850, y: 80 },
            s: { x: 200, y: 650 },
            h1: { x: 50, y: 50 },
            m2: { x: 450, y: 700 },
            l: { x: -64, y: 700 },
            o: { x: 700, y: 700 }
          },
          4: {
            o: { x: 850, y: 850 },
            h2: { x: 600, y: 100 },
            m1: { x: 240, y: 60 },
            s: { x: 200, y: 680 },
            l: { x: -64, y: 700 },
            m2: { x: 700, y: 700 },
            h1: { x: 450, y: 700 }
          },
          5: {
            m2: { x: 720, y: 200 },
            o: { x: 850, y: 80 },
            h2: { x: 200, y: 650 },
            m1: { x: 50, y: 50 },
            s: { x: 450, y: 700 },
            l: { x: -64, y: 700 },
            h1: { x: 700, y: 700 }
          },
          6: {
            h1: { x: 850, y: 850 },
            m2: { x: 600, y: 100 },
            o: { x: 240, y: 60 },
            h2: { x: 200, y: 680 },
            m1: { x: -64, y: 700 },
            s: { x: 700, y: 700 },
            l: { x: 450, y: 700 }
          }
        },
        62: {
          1: {
            s: { x: 840, y: 700 },
            l: { x: 700, y: 650 },
            m2: { x: 150, y: 100 },
            o: { x: 54, y: 60 },
            h1: { x: 200, y: 600 },
            h2: { x: 450, y: 650 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 650 },
            s: { x: 740, y: 60 },
            h1: { x: 200, y: 630 },
            m2: { x: 60, y: 60 },
            o: { x: 400, y: 100 },
            h2: { x: 450, y: 650 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 650 },
            m1: { x: 740, y: 40 },
            s: { x: 600, y: 100 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 650 },
            o: { x: 560, y: 170 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 840, y: 700 },
            l: { x: 700, y: 650 },
            m1: { x: 150, y: 100 },
            s: { x: 54, y: 60 },
            h2: { x: 200, y: 600 },
            h1: { x: 450, y: 650 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 650 },
            o: { x: 700, y: 100 },
            h2: { x: 200, y: 630 },
            m1: { x: 60, y: 60 },
            s: { x: 400, y: 100 },
            h1: { x: 450, y: 650 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 650 },
            m2: { x: 700, y: 40 },
            o: { x: 600, y: 100 },
            h2: { x: 200, y: 630 },
            l: { x: 450, y: 650 },
            s: { x: 510, y: 170 },
            m1: { x: -64, y: 700 }
          }
        },
        '62b': {
          1: {
            s: { x: 840, y: 700 },
            h1: { x: 700, y: 650 },
            m2: { x: 400, y: 250 },
            h2: { x: 150, y: 600 },
            o: { x: 20, y: 250 },
            l: { x: 450, y: 650 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 650 },
            s: { x: 840, y: 250 },
            h1: { x: 200, y: 600 },
            m2: { x: 60, y: 60 },
            o: { x: 350, y: 140 },
            h2: { x: 450, y: 650 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 650 },
            m1: { x: 850, y: 250 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 650 },
            o: { x: 550, y: 150 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 840, y: 700 },
            h2: { x: 700, y: 650 },
            m1: { x: 400, y: 250 },
            h1: { x: 150, y: 600 },
            s: { x: 20, y: 250 },
            l: { x: 450, y: 650 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 650 },
            o: { x: 840, y: 250 },
            h2: { x: 200, y: 600 },
            m1: { x: 60, y: 60 },
            s: { x: 350, y: 140 },
            h1: { x: 450, y: 650 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 650 },
            m2: { x: 850, y: 250 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 650 },
            s: { x: 550, y: 150 },
            m1: { x: -64, y: 700 }
          }
        },
        42: {
          1: {
            s: { x: 850, y: 850 },
            h1: { x: 450, y: 700 },
            m2: { x: 400, y: 60 },
            o: { x: 360, y: 150 },
            h2: { x: 200, y: 700 },
            l: { x: 700, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 700 },
            s: { x: 600, y: 150 },
            h1: { x: 200, y: 650 },
            m2: { x: 40, y: 60 },
            o: { x: 50, y: 850 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 700 },
            m1: { x: 640, y: 40 },
            s: { x: 600, y: 150 },
            h1: { x: 200, y: 650 },
            l: { x: 450, y: 700 },
            o: { x: 500, y: 850 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 850, y: 850 },
            h2: { x: 450, y: 700 },
            m1: { x: 400, y: 60 },
            s: { x: 350, y: 150 },
            h1: { x: 200, y: 700 },
            l: { x: 700, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 700 },
            o: { x: 700, y: 100 },
            h2: { x: 200, y: 650 },
            m1: { x: 40, y: 60 },
            s: { x: 50, y: 850 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 700 },
            m2: { x: 650, y: 40 },
            o: { x: 600, y: 100 },
            h2: { x: 200, y: 650 },
            l: { x: 450, y: 700 },
            s: { x: 500, y: 850 },
            m1: { x: -64, y: 700 }
          }
        },
      },
      receivingSet: {
        51: {
          1: {
            s: { x: 600, y: 100 },
            o: { x: 900, y: 300 },
            m2: { x: 450, y: 300 },
            h1: { x: 0, y: 300 },
            h2: { x: 450, y: 600 },
            l: { x: 400, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 600, y: 100 },
            h1: { x: 0, y: 300 },
            m2: { x: 450, y: 300 },
            o: { x: 850, y: 600 },
            h2: { x: 430, y: 600 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 600 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 0, y: 300 },
            l: { x: 400, y: 700 },
            o: { x: 850, y: 600 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 850, y: 600 },
            h2: { x: 0, y: 300 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 700 },
            l: { x: 700, y: 600 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 600 },
            o: { x: 900, y: 300 },
            h2: { x: 0, y: 300 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 600 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 600 },
            m2: { x: 450, y: 300 },
            o: { x: 900, y: 300 },
            h2: { x: 0, y: 300 },
            l: { x: 400, y: 700 },
            s: { x: 600, y: 100 },
            m1: { x: -64, y: 700 }
          }
        },
        '51b': {
          1: {
            s: { x: 600, y: 100 },
            o: { x: 0, y: 300 },
            m2: { x: 450, y: 300 },
            h1: { x: 900, y: 300 },
            h2: { x: 300, y: 600 },
            l: { x: 600, y: 600 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 650, y: 100 },
            h1: { x: 0, y: 300 },
            m2: { x: 450, y: 300 },
            o: { x: 200, y: 600 },
            h2: { x: 450, y: 600 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 600 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 0, y: 300 },
            l: { x: 200, y: 600 },
            o: { x: 850, y: 600 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 850, y: 600 },
            h2: { x: 0, y: 300 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 700 },
            l: { x: 200, y: 400 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 600 },
            o: { x: 900, y: 300 },
            h2: { x: 0, y: 300 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 250, y: 600 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 600 },
            m2: { x: 450, y: 300 },
            o: { x: 900, y: 300 },
            h2: { x: 0, y: 300 },
            l: { x: 200, y: 500 },
            s: { x: 600, y: 100 },
            m1: { x: -64, y: 700 }
          }
        },
        '3M': {   //m2<-h1; m3<-O;h1<-m2;
          1: {
            s: { x: 600, y: 100 },
            h1: { x: 900, y: 300 },
            m2: { x: 0, y: 300 },
            o: { x: 450, y: 300 },
            h2: { x: 250, y: 600 },
            l: { x: -64, y: 700 },
            m1: { x: 650, y: 600 }
          },
          2: {
            l: { x: 450, y: 800 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 300 },
            m2: { x: 0, y: 350 },
            o: { x: -64, y: 700 },
            h2: { x: 200, y: 600 },
            m1: { x: 700, y: 600 }
          },
          3: {
            h2: { x: 700, y: 580 },
            m1: { x: 450, y: 300 },
            s: { x: 650, y: 80 },
            h1: { x: 0, y: 300 },
            l: { x: 450, y: 700 },
            o: { x: -64, y: 700 },
            m2: { x: 200, y: 580 }
          },
          4: {
            o: { x: -64, y: 700 },
            h2: { x: 0, y: 300 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 250, y: 600 },
            l: { x: 450, y: 800 },
            m2: { x: 650, y: 600 }
          },
          5: {
            l: { x: -64, y: 700 },
            o: { x: 900, y: 300 },
            h2: { x: 0, y: 300 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 200, y: 600 },
            m2: { x: 700, y: 600 }
          },
          6: {
            h1: { x: 600, y: 600 },
            m2: { x: 0, y: 550 },
            o: { x: 450, y: 300 },
            h2: { x: 850, y: 550 },
            l: { x: -64, y: 700 },
            s: { x: 600, y: 100 },
            m1: { x: 300, y: 600 }
          }
        },
        63: {   //s2<-m2; h2<-O;s3<-h2; h3<-m1
          1: {
            s: { x: 600, y: 100 },
            h1: { x: 900, y: 300 },
            m2: { x: 0, y: 300 },
            o: { x: 450, y: 300 },
            h2: { x: 250, y: 600 },
            m1: { x: -64, y: 700 },
            l: { x: 650, y: 600 }
          },
          2: {
            l: { x: 450, y: 800 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 300 },
            m2: { x: 0, y: 350 },
            m1: { x: -64, y: 700 },
            o: { x: 200, y: 600 },
            h2: { x: 700, y: 600 }
          },
          3: {
            l: { x: -64, y: 700 },
            m1: { x: 900, y: 300 },
            s: { x: 0, y: 350 },
            h1: { x: 450, y: 300 },
            h2: { x: 600, y: 100 },
            m2: { x: 200, y: 600 },
            o: { x: 700, y: 600 }
          },
          4: {
            m2: { x: 800, y: 600 },
            s: { x: 0, y: 450 },
            m1: { x: 450, y: 300 },
            h1: { x: 200, y: 600 },
            l: { x: -64, y: 700 },
            h2: { x: 600, y: 100 },
            o: { x: 450, y: 600 }
          },
          5: {
            l: { x: -64, y: 700 },
            o: { x: 900, y: 300 },
            h2: { x: 0, y: 350 },
            m1: { x: 450, y: 300 },
            m2: { x: 600, y: 100 },
            s: { x: 200, y: 600 },
            h1: { x: 700, y: 600 }
          },
          6: {
            s: { x: 800, y: 600 },
            h2: { x: 0, y: 450 },
            o: { x: 450, y: 300 },
            l: { x: 250, y: 550 },
            m1: { x: -64, y: 700 },
            m2: { x: 600, y: 100 },
            h1: { x: 450, y: 600 }
          }
        },
        62: {
          1: {
            s: { x: 600, y: 100 },
            o: { x: 900, y: 300 },
            m2: { x: 450, y: 300 },
            h1: { x: 0, y: 300 },
            h2: { x: 450, y: 600 },
            l: { x: 400, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 900, y: 300 },
            h1: { x: 0, y: 300 },
            m2: { x: 450, y: 300 },
            o: { x: 600, y: 100 },
            h2: { x: 450, y: 600 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 600 },
            m1: { x: 450, y: 300 },
            s: { x: 900, y: 300 },
            h1: { x: 0, y: 300 },
            l: { x: 400, y: 700 },
            o: { x: 600, y: 100 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 600, y: 100 },
            s: { x: 900, y: 300 },
            m1: { x: 450, y: 300 },
            h2: { x: 0, y: 300 },
            h1: { x: 450, y: 600 },
            l: { x: 400, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 600 },
            o: { x: 900, y: 300 },
            h2: { x: 0, y: 300 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 600 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 600 },
            m2: { x: 450, y: 300 },
            o: { x: 900, y: 300 },
            h2: { x: 0, y: 300 },
            l: { x: 400, y: 700 },
            s: { x: 600, y: 100 },
            m1: { x: -64, y: 700 }
          }
        },
        '62b': {
          1: {
            s: { x: 600, y: 100 },
            h1: { x: 900, y: 300 },
            m2: { x: 450, y: 300 },
            o: { x: 0, y: 300 },
            h2: { x: 250, y: 600 },
            l: { x: 600, y: 600 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 900, y: 300 },
            h1: { x: 0, y: 300 },
            m2: { x: 450, y: 300 },
            o: { x: 600, y: 100 },
            h2: { x: 300, y: 600 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 600, y: 600 },
            m1: { x: 450, y: 300 },
            s: { x: 900, y: 300 },
            h1: { x: 0, y: 300 },
            l: { x: 200, y: 600 },
            o: { x: 600, y: 100 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 600, y: 100 },
            h2: { x: 900, y: 300 },
            m1: { x: 450, y: 300 },
            s: { x: 0, y: 300 },
            h1: { x: 300, y: 600 },
            l: { x: 700, y: 600 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 600 },
            o: { x: 900, y: 300 },
            h2: { x: 0, y: 300 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 600 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 600 },
            m2: { x: 450, y: 300 },
            o: { x: 900, y: 300 },
            h2: { x: 0, y: 300 },
            l: { x: 200, y: 600 },
            s: { x: 600, y: 100 },
            m1: { x: -64, y: 700 }
          }
        },
        42: {
          1: {
            s: { x: 700, y: 600 },
            h1: { x: 0, y: 350 },
            m2: { x: 450, y: 300 },
            o: { x: 600, y: 150 },
            h2: { x: 200, y: 600 },
            l: { x: 450, y: 800 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 450, y: 800 },
            s: { x: 600, y: 100 },
            h1: { x: 0, y: 340 },
            m2: { x: 450, y: 300 },
            o: { x: 200, y: 600 },
            h2: { x: 700, y: 600 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 600 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 0, y: 340 },
            l: { x: 450, y: 800 },
            o: { x: 200, y: 600 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 600 },
            h2: { x: 0, y: 340 },
            m1: { x: 450, y: 300 },
            s: { x: 600, y: 150 },
            h1: { x: 200, y: 600 },
            l: { x: 450, y: 800 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 450, y: 800 },
            o: { x: 600, y: 150 },
            h2: { x: 0, y: 340 },
            m1: { x: 450, y: 300 },
            s: { x: 200, y: 600 },
            h1: { x: 700, y: 600 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 600 },
            h2: { x: 0, y: 350 },
            m2: { x: 450, y: 300 },
            o: { x: 600, y: 150 },
            s: { x: 200, y: 600 },
            l: { x: 450, y: 800 },
            m1: { x: -64, y: 700 }
          }
        },
      },
      receivingAttack: {
        51: {
          1: {
            s: { x: 600, y: 100 },
            o: { x: 800, y: 100 },
            m2: { x: 450, y: 100 },
            h1: { x: 100, y: 100 },
            h2: { x: 450, y: 300 },
            l: { x: 400, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 600 },
            s: { x: 600, y: 100 },
            h1: { x: 100, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 840, y: 300 },
            h2: { x: 440, y: 300 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 300 },
            m1: { x: 450, y: 100 },
            s: { x: 600, y: 100 },
            h1: { x: 100, y: 100 },
            l: { x: 450, y: 700 },
            o: { x: 840, y: 300 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 840, y: 300 },
            h2: { x: 100, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 300 },
            l: { x: 400, y: 600 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 400, y: 600 },
            o: { x: 800, y: 100 },
            h2: { x: 100, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 300 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 300 },
            m2: { x: 450, y: 100 },
            o: { x: 800, y: 100 },
            h2: { x: 100, y: 100 },
            l: { x: 400, y: 700 },
            s: { x: 600, y: 100 },
            m1: { x: -64, y: 700 }
          }
        },
        '51b': {
          1: {
            s: { x: 600, y: 100 },
            o: { x: 100, y: 100 },
            m2: { x: 450, y: 100 },
            h1: { x: 800, y: 100 },
            h2: { x: 300, y: 300 },
            l: { x: 600, y: 300 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 300 },
            s: { x: 600, y: 100 },
            h1: { x: 100, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 200, y: 300 },
            h2: { x: 440, y: 300 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 300 },
            m1: { x: 450, y: 100 },
            s: { x: 600, y: 100 },
            h1: { x: 100, y: 100 },
            l: { x: 200, y: 300 },
            o: { x: 840, y: 300 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 840, y: 300 },
            h2: { x: 100, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 300 },
            l: { x: 200, y: 200 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 700, y: 300 },
            o: { x: 800, y: 100 },
            h2: { x: 100, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 600, y: 100 },
            h1: { x: 250, y: 300 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 300 },
            m2: { x: 450, y: 100 },
            o: { x: 800, y: 100 },
            h2: { x: 100, y: 100 },
            l: { x: 200, y: 200 },
            s: { x: 600, y: 100 },
            m1: { x: -64, y: 700 }
          }
        },
        '3M': {
          1: {
            s: { x: 600, y: 100 },
            h1: { x: 900, y: 60 },
            m2: { x: 0, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 250, y: 300 },
            l: { x: -64, y: 700 },
            m1: { x: 650, y: 300 }
          },
          2: {
            l: { x: 450, y: 400 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 50 },
            m2: { x: 50, y: 50 },
            o: { x: -64, y: 700 },
            h2: { x: 200, y: 300 },
            m1: { x: 700, y: 300 }
          },
          3: {
            h2: { x: 700, y: 300 },
            m1: { x: 450, y: 100 },
            s: { x: 650, y: 80 },
            h1: { x: 0, y: 100 },
            l: { x: 450, y: 700 },
            o: { x: -64, y: 700 },
            m2: { x: 200, y: 300 }
          },
          4: {
            o: { x: -64, y: 700 },
            h2: { x: 0, y: 50 },
            m1: { x: 450, y: 50 },
            s: { x: 600, y: 100 },
            h1: { x: 250, y: 300 },
            l: { x: 450, y: 400 },
            m2: { x: 650, y: 300 }
          },
          5: {
            l: { x: -64, y: 700 },
            o: { x: 900, y: 100 },
            h2: { x: 0, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 600, y: 100 },
            h1: { x: 200, y: 300 },
            m2: { x: 700, y: 300 }
          },
          6: {
            h1: { x: 600, y: 300 },
            m2: { x: 0, y: 50 },
            o: { x: 450, y: 50 },
            h2: { x: 850, y: 50 },
            l: { x: -64, y: 700 },
            s: { x: 600, y: 100 },
            m1: { x: 300, y: 300 }
          }
        },
        63: {
          1: {
            s: { x: 600, y: 100 },
            h1: { x: 900, y: 60 },
            m2: { x: 0, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 250, y: 300 },
            m1: { x: -64, y: 700 },
            l: { x: 650, y: 300 }
          },
          2: {
            l: { x: 450, y: 400 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 50 },
            m2: { x: 50, y: 50 },
            m1: { x: -64, y: 700 },
            o: { x: 200, y: 300 },
            h2: { x: 700, y: 300 }
          },
          3: {
            l: { x: -64, y: 700 },
            m1: { x: 850, y: 50 },
            s: { x: 50, y: 50 },
            h1: { x: 450, y: 50 },
            h2: { x: 600, y: 100 },
            m2: { x: 200, y: 300 },
            o: { x: 700, y: 300 }
          },
          4: {
            m2: { x: 800, y: 300 },
            s: { x: 0, y: 50 },
            m1: { x: 450, y: 50 },
            h1: { x: 200, y: 300 },
            l: { x: -64, y: 700 },
            h2: { x: 600, y: 100 },
            o: { x: 450, y: 300 }
          },
          5: {
            l: { x: -64, y: 700 },
            o: { x: 850, y: 50 },
            h2: { x: 50, y: 50 },
            m1: { x: 450, y: 50 },
            m2: { x: 600, y: 100 },
            s: { x: 200, y: 300 },
            h1: { x: 700, y: 300 }
          },
          6: {
            s: { x: 800, y: 300 },
            h2: { x: 50, y: 50 },
            o: { x: 450, y: 50 },
            l: { x: 250, y: 100 },
            m1: { x: -64, y: 700 },
            m2: { x: 600, y: 100 },
            h1: { x: 450, y: 300 }
          }
        },
        62: {
          1: {
            s: { x: 600, y: 100 },
            o: { x: 800, y: 100 },
            m2: { x: 450, y: 100 },
            h1: { x: 100, y: 100 },
            h2: { x: 450, y: 300 },
            l: { x: 400, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 400, y: 600 },
            s: { x: 800, y: 100 },
            h1: { x: 100, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 600, y: 100 },
            h2: { x: 450, y: 300 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 300 },
            m1: { x: 450, y: 100 },
            s: { x: 800, y: 100 },
            h1: { x: 100, y: 100 },
            l: { x: 450, y: 700 },
            o: { x: 600, y: 100 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 600, y: 100 },
            s: { x: 800, y: 100 },
            m1: { x: 450, y: 100 },
            h2: { x: 100, y: 100 },
            h1: { x: 450, y: 300 },
            l: { x: 400, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 400, y: 600 },
            o: { x: 800, y: 100 },
            h2: { x: 100, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 300 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 300 },
            m2: { x: 450, y: 100 },
            o: { x: 800, y: 100 },
            h2: { x: 100, y: 100 },
            l: { x: 400, y: 700 },
            s: { x: 600, y: 100 },
            m1: { x: -64, y: 700 }
          }
        },
        '62b': {
          1: {
            s: { x: 600, y: 100 },
            h1: { x: 800, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 100, y: 100 },
            h2: { x: 250, y: 300 },
            l: { x: 600, y: 300 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 700, y: 300 },
            s: { x: 800, y: 100 },
            h1: { x: 100, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 600, y: 100 },
            h2: { x: 300, y: 300 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 600, y: 300 },
            m1: { x: 450, y: 100 },
            s: { x: 800, y: 100 },
            h1: { x: 100, y: 100 },
            l: { x: 200, y: 300 },
            o: { x: 600, y: 100 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 600, y: 100 },
            h2: { x: 800, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 100, y: 100 },
            h1: { x: 300, y: 300 },
            l: { x: 700, y: 300 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 400, y: 600 },
            o: { x: 800, y: 100 },
            h2: { x: 100, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 600, y: 100 },
            h1: { x: 450, y: 300 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 300 },
            m2: { x: 450, y: 100 },
            o: { x: 800, y: 100 },
            h2: { x: 100, y: 100 },
            l: { x: 200, y: 300 },
            s: { x: 600, y: 100 },
            m1: { x: -64, y: 700 }
          }
        },
        42: {
          1: {
            s: { x: 700, y: 350 },
            h1: { x: 0, y: 50 },
            m2: { x: 450, y: 50 },
            o: { x: 600, y: 150 },
            h2: { x: 200, y: 350 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 450, y: 600 },
            s: { x: 600, y: 100 },
            h1: { x: 0, y: 40 },
            m2: { x: 450, y: 40 },
            o: { x: 200, y: 300 },
            h2: { x: 700, y: 300 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 700, y: 300 },
            m1: { x: 450, y: 40 },
            s: { x: 600, y: 100 },
            h1: { x: 0, y: 40 },
            l: { x: 450, y: 600 },
            o: { x: 200, y: 300 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 300 },
            h2: { x: 40, y: 40 },
            m1: { x: 450, y: 40 },
            s: { x: 600, y: 150 },
            h1: { x: 200, y: 300 },
            l: { x: 450, y: 600 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 450, y: 600 },
            o: { x: 600, y: 150 },
            h2: { x: 40, y: 40 },
            m1: { x: 450, y: 40 },
            s: { x: 200, y: 300 },
            h1: { x: 700, y: 300 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 700, y: 300 },
            h2: { x: 50, y: 50 },
            m2: { x: 450, y: 50 },
            o: { x: 600, y: 150 },
            s: { x: 200, y: 300 },
            l: { x: 200, y: 300 },
            m1: { x: -64, y: 700 }
          }
        },
      },
      receivingSwitch: {
        51: {
          1: {
            s: { x: 700, y: 400 },
            h1: { x: 200, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 700 },
            l: { x: 200, y: 400 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 200, y: 400 },
            s: { x: 700, y: 100 },
            h1: { x: 200, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 700, y: 400 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 700 },
            m1: { x: 450, y: 100 },
            s: { x: 700, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 400 },
            o: { x: 700, y: 400 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 400 },
            h2: { x: 200, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 700 },
            l: { x: 200, y: 400 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 200, y: 400 },
            o: { x: 700, y: 100 },
            h2: { x: 200, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 700, y: 400 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 700 },
            m2: { x: 450, y: 100 },
            o: { x: 700, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 400 },
            s: { x: 700, y: 400 },
            m1: { x: -64, y: 700 }
          }
        },
        '51b': {
          1: {
            s: { x: 700, y: 350 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 450, y: 700 },
            l: { x: 200, y: 350 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 200, y: 350 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 350 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 700 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            l: { x: 200, y: 350 },
            o: { x: 700, y: 350 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 350 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 450, y: 700 },
            l: { x: 200, y: 350 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 200, y: 350 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 350 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 700 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            l: { x: 200, y: 350 },
            s: { x: 700, y: 350 },
            m1: { x: -64, y: 700 }
          }
        },
        '3M': {
          1: {
            s: { x: 700, y: 400 },
            h1: { x: 450, y: 60 },
            m2: { x: 150, y: 60 },
            o: { x: 750, y: 60 },
            m1: { x: 200, y: 400 },
            l: { x: -64, y: 700 },
            h2: { x: 450, y: 700 }
          },
          2: {
            l: { x: 150, y: 400 },
            s: { x: 750, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            o: { x: -64, y: 700 },
            h2: { x: 450, y: 700 },
            m1: { x: 750, y: 400 }
          },
          3: {
            h2: { x: 450, y: 700 },
            m1: { x: 450, y: 100 },
            s: { x: 700, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 400 },
            o: { x: -64, y: 700 },
            m2: { x: 700, y: 400 }
          },
          4: {
            o: { x: -64, y: 700 },
            h2: { x: 200, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 700 },
            l: { x: 200, y: 400 },
            m2: { x: 700, y: 400 }
          },
          5: {
            l: { x: -64, y: 700 },
            o: { x: 700, y: 50 },
            h2: { x: 200, y: 50 },
            m1: { x: 450, y: 50 },
            s: { x: 700, y: 400 },
            h1: { x: 450, y: 700 },
            m2: { x: 200, y: 400 }
          },
          6: {
            h1: { x: 450, y: 700 },
            h2: { x: 700, y: 50 },
            o: { x: 450, y: 50 },
            m2: { x: 200, y: 50 },
            l: { x: -64, y: 700 },
            s: { x: 700, y: 400 },
            m1: { x: 200, y: 400 }
          }
        },
        63: { //s2<-m2; h2<-O;s3<-h2; h3<-m1
          1: {
            s: { x: 700, y: 400 },
            h1: { x: 450, y: 60 },
            m2: { x: 150, y: 60 },
            o: { x: 750, y: 60 },
            l: { x: 200, y: 400 },
            m1: { x: -64, y: 700 },
            h2: { x: 450, y: 700 }
          },
          2: {
            l: { x: 150, y: 400 },
            s: { x: 750, y: 100 },
            h1: { x: 450, y: 100 },
            m2: { x: 200, y: 100 },
            m1: { x: -64, y: 700 },
            o: { x: 450, y: 700 },
            h2: { x: 750, y: 400 }
          },
          3: {
            o: { x: 450, y: 700 },
            h1: { x: 450, y: 60 },
            m1: { x: 700, y: 60 },
            s: { x: 200, y: 60 },
            m2: { x: 200, y: 400 },
            l: { x: -64, y: 700 },
            h2: { x: 700, y: 400 }
          },
          4: {
            l: { x: -64, y: 700 },
            s: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            h2: { x: 700, y: 60 },
            m2: { x: 700, y: 400 },
            h1: { x: 200, y: 400 },
            o: { x: 450, y: 700 }
          },
          5: {
            l: { x: -64, y: 700 },
            o: { x: 700, y: 50 },
            h2: { x: 200, y: 50 },
            m1: { x: 450, y: 50 },
            m2: { x: 700, y: 400 },
            h1: { x: 450, y: 700 },
            s: { x: 200, y: 400 }
          },
          6: {
            h1: { x: 450, y: 700 },
            m2: { x: 700, y: 60 },
            o: { x: 450, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: -64, y: 700 },
            s: { x: 700, y: 400 },
            l: { x: 200, y: 400 }
          }
        },
        62: {
          1: {
            s: { x: 700, y: 400 },
            h1: { x: 200, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 700, y: 100 },
            h2: { x: 450, y: 700 },
            l: { x: 200, y: 400 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 200, y: 400 },
            s: { x: 700, y: 100 },
            h1: { x: 200, y: 100 },
            m2: { x: 450, y: 100 },
            o: { x: 700, y: 400 },
            h2: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 700 },
            m1: { x: 450, y: 100 },
            s: { x: 700, y: 100 },
            h1: { x: 200, y: 100 },
            l: { x: 200, y: 400 },
            o: { x: 700, y: 400 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 400 },
            h2: { x: 200, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 700, y: 100 },
            h1: { x: 450, y: 700 },
            l: { x: 200, y: 400 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 200, y: 400 },
            o: { x: 700, y: 100 },
            h2: { x: 200, y: 100 },
            m1: { x: 450, y: 100 },
            s: { x: 700, y: 400 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 700 },
            m2: { x: 450, y: 100 },
            o: { x: 700, y: 100 },
            h2: { x: 200, y: 100 },
            l: { x: 200, y: 400 },
            s: { x: 700, y: 400 },
            m1: { x: -64, y: 700 }
          }
        },
        '62b': {
          1: {
            s: { x: 700, y: 350 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            l: { x: 450, y: 700 },
            h2: { x: 200, y: 350 },
            m1: { x: -64, y: 700 }
          },
          2: {
            h2: { x: 200, y: 350 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 350 },
            l: { x: 450, y: 700 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 450, y: 700 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            l: { x: 200, y: 350 },
            o: { x: 700, y: 350 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 350 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 450, y: 700 },
            l: { x: 200, y: 350 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 200, y: 350 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 350 },
            h1: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          6: {
            h1: { x: 450, y: 700 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            l: { x: 200, y: 350 },
            s: { x: 700, y: 350 },
            m1: { x: -64, y: 700 }
          }
        },
        42: {
          1: {
            s: { x: 700, y: 350 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            l: { x: 450, y: 700 },
            h2: { x: 200, y: 350 },
            m1: { x: -64, y: 700 }
          },
          2: {
            l: { x: 450, y: 700 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 400 },
            h2: { x: 200, y: 400 },
            m1: { x: -64, y: 700 }
          },
          3: {
            h2: { x: 200, y: 400 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 60 },
            l: { x: 450, y: 700 },
            o: { x: 700, y: 400 },
            m2: { x: -64, y: 700 }
          },
          4: {
            o: { x: 700, y: 400 },
            h2: { x: 200, y: 60 },
            m1: { x: 450, y: 60 },
            s: { x: 700, y: 60 },
            h1: { x: 200, y: 400 },
            l: { x: 450, y: 700 },
            m2: { x: -64, y: 700 }
          },
          5: {
            l: { x: 450, y: 700 },
            m1: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            h1: { x: 200, y: 400 },
            s: { x: 700, y: 400 },
            m2: { x: -64, y: 700 }
          },
          6: {
            l: { x: 450, y: 700 },
            m2: { x: 450, y: 60 },
            o: { x: 700, y: 60 },
            h2: { x: 200, y: 60 },
            h1: { x: 200, y: 400 },
            s: { x: 700, y: 400 },
            m1: { x: -64, y: 700 }
          }
        },
      }
    };

    this.players = {
      s: this.court.addPlayer(this.playerPositions.servingBase[this.system][2].s.x, this.playerPositions.servingBase[this.system][2].s.y, this.text[this.language].players[this.system].s),
      h1: this.court.addPlayer(this.playerPositions.servingBase[this.system][2].h1.x, this.playerPositions.servingBase[this.system][2].h1.y, this.text[this.language].players[this.system].h1),
      m1: this.court.addPlayer(this.playerPositions.servingBase[this.system][2].m1.x, this.playerPositions.servingBase[this.system][2].m1.y, this.text[this.language].players[this.system].m1),
      o: this.court.addPlayer(this.playerPositions.servingBase[this.system][2].o.x, this.playerPositions.servingBase[this.system][2].o.y, this.text[this.language].players[this.system].o),
      h2: this.court.addPlayer(this.playerPositions.servingBase[this.system][2].h2.x, this.playerPositions.servingBase[this.system][2].h2.y, this.text[this.language].players[this.system].h2),
      m2: this.court.addPlayer(this.playerPositions.servingBase[this.system][2].m2.x, this.playerPositions.servingBase[this.system][2].m2.y, this.text[this.language].players[this.system].m2),
      l: this.court.addPlayer(this.playerPositions.servingBase[this.system][2].l.x, this.playerPositions.servingBase[this.system][2].l.y, this.text[this.language].players[this.system].l)
    }

    this.state = {
      moving: false,
      setterAt: 2,
      overlapDetectable: false
    }

    this.showTutorial = typeof config.showTutorial === 'boolean' ? config.showTutorial : true
  }

  draw() {
    if (this.drawn) {
      return
    }
    this.drawn = true
    this.court.draw()
    this.drawRotationControl()
    this.drawActionControl()
    this.drawCheckOverlapButton();
    if (this.showTutorial) {
      this.drawTutorialButton()
    }

  }

  multilineText(text, lineHeight, style) {
    let textGroup
    text.split('\n').forEach((textChunks, i) => {
      let textLine = this.svg.snapRoot.text(0, 0 + (i * lineHeight * this.svg.scale), textChunks).attr(style)
      if (textGroup) {
        textGroup.add(textLine)
      } else {
        textGroup = this.svg.snapRoot.group(textLine)
      }
    })
    return textGroup
  }

  drawRotationControl() {
    const vOffset1 = 20 * this.svg.scale
    const vOffset2 = 140 * this.svg.scale

    const box1 = this.svg.snapRoot.rect(0, 0 * this.svg.scale, 540 * this.svg.scale, 60 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB,
    })
    const box2 = this.svg.snapRoot.rect(0, 60 * this.svg.scale, 540 * this.svg.scale, 160 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourA,
    })
    const box3 = this.svg.snapRoot.rect(0, 60 * this.svg.scale + (1 * (vOffset1 + vOffset2)), 540 * this.svg.scale, 160 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB,
    })
    const box4 = this.svg.snapRoot.rect(0, 60 * this.svg.scale + (2 * (vOffset1 + vOffset2)), 540 * this.svg.scale, 160 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourA,
    })
    const box5 = this.svg.snapRoot.rect(0, 60 * this.svg.scale + (3 * (vOffset1 + vOffset2)), 540 * this.svg.scale, 160 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB,
    })
    const box6 = this.svg.snapRoot.rect(0, 60 * this.svg.scale + (4 * (vOffset1 + vOffset2)), 540 * this.svg.scale, 160 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourA,
    })
    const box7 = this.svg.snapRoot.rect(0, 60 * this.svg.scale + (5 * (vOffset1 + vOffset2)), 540 * this.svg.scale, 161 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB,
    })
    const backgroundBoxes = this.svg.snapRoot.group(box1, box2, box3, box4, box5, box6, box7)

    const textHeadingS = this.svg.snapRoot.text(80 * this.svg.scale, 40 * this.svg.scale, this.text[this.language].rotationControl[this.system].serving).attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': '' + 28 * this.svg.scale,
    })
    const textHeadingR = this.svg.snapRoot.text(280 * this.svg.scale, 40 * this.svg.scale, this.text[this.language].rotationControl[this.system].receiving).attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': '' + 28 * this.svg.scale,
    })
    const headingLabels = this.svg.snapRoot.group(textHeadingS, textHeadingR)

    const textLabel2 = this.multilineText(this.text[this.language].rotationControl[this.system].s2, 28, {
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 28 * this.svg.scale,
    }).transform(`t${420 * this.svg.scale}, ${100 * this.svg.scale}`)
    const textLabel1 = this.multilineText(this.text[this.language].rotationControl[this.system].s1, 28, {
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 28 * this.svg.scale,
    }).transform(`t${420 * this.svg.scale}, ${100 * this.svg.scale + (1 * (vOffset1 + vOffset2))}`)
    const textLabel6 = this.multilineText(this.text[this.language].rotationControl[this.system].s6, 28, {
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 28 * this.svg.scale,
    }).transform(`t${420 * this.svg.scale}, ${100 * this.svg.scale + (2 * (vOffset1 + vOffset2))}`)
    const textLabel5 = this.multilineText(this.text[this.language].rotationControl[this.system].s5, 28, {
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 28 * this.svg.scale,
    }).transform(`t${420 * this.svg.scale}, ${100 * this.svg.scale + (3 * (vOffset1 + vOffset2))}`)
    const textLabel4 = this.multilineText(this.text[this.language].rotationControl[this.system].s4, 28, {
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 28 * this.svg.scale,
    }).transform(`t${420 * this.svg.scale}, ${100 * this.svg.scale + (4 * (vOffset1 + vOffset2))}`)
    const textLabel3 = this.multilineText(this.text[this.language].rotationControl[this.system].s3, 28, {
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 28 * this.svg.scale,
    }).transform(`t${420 * this.svg.scale}, ${100 * this.svg.scale + (5 * (vOffset1 + vOffset2))}`)
    const rotationLabels = this.svg.snapRoot.group(textLabel1, textLabel2, textLabel3, textLabel4, textLabel5, textLabel6)

    const joinLine1 = this.svg.snapRoot.line(80 * this.svg.scale, 100 * this.svg.scale, 280 * this.svg.scale, 100 * this.svg.scale + (1 * vOffset1)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLine2 = this.svg.snapRoot.line(280 * this.svg.scale, 100 * this.svg.scale + (1 * vOffset1), 80 * this.svg.scale, 100 * this.svg.scale + (1 * vOffset1) + (1 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLine3 = this.svg.snapRoot.line(80 * this.svg.scale, 100 * this.svg.scale + (1 * vOffset1) + (1 * vOffset2), 280 * this.svg.scale, 100 * this.svg.scale + (2 * vOffset1) + (1 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLine4 = this.svg.snapRoot.line(280 * this.svg.scale, 100 * this.svg.scale + (2 * vOffset1) + (1 * vOffset2), 80 * this.svg.scale, 100 * this.svg.scale + (2 * vOffset1) + (2 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLine5 = this.svg.snapRoot.line(80 * this.svg.scale, 100 * this.svg.scale + (2 * vOffset1) + (2 * vOffset2), 280 * this.svg.scale, 100 * this.svg.scale + (3 * vOffset1) + (2 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLine6 = this.svg.snapRoot.line(280 * this.svg.scale, 100 * this.svg.scale + (3 * vOffset1) + (2 * vOffset2), 80 * this.svg.scale, 100 * this.svg.scale + (3 * vOffset1) + (3 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLine7 = this.svg.snapRoot.line(80 * this.svg.scale, 100 * this.svg.scale + (3 * vOffset1) + (3 * vOffset2), 280 * this.svg.scale, 100 * this.svg.scale + (4 * vOffset1) + (3 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLine8 = this.svg.snapRoot.line(280 * this.svg.scale, 100 * this.svg.scale + (4 * vOffset1) + (3 * vOffset2), 80 * this.svg.scale, 100 * this.svg.scale + (4 * vOffset1) + (4 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLine9 = this.svg.snapRoot.line(80 * this.svg.scale, 100 * this.svg.scale + (4 * vOffset1) + (4 * vOffset2), 280 * this.svg.scale, 100 * this.svg.scale + (5 * vOffset1) + (4 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLine10 = this.svg.snapRoot.line(280 * this.svg.scale, 100 * this.svg.scale + (5 * vOffset1) + (4 * vOffset2), 80 * this.svg.scale, 100 * this.svg.scale + (5 * vOffset1) + (5 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLine11 = this.svg.snapRoot.line(80 * this.svg.scale, 100 * this.svg.scale + (5 * vOffset1) + (5 * vOffset2), 280 * this.svg.scale, 100 * this.svg.scale + (6 * vOffset1) + (5 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      'stroke-dasharray': 8 * this.svg.scale + ', ' + 8 * this.svg.scale,
    })
    const joinLines = this.svg.snapRoot.group(joinLine1, joinLine2, joinLine3, joinLine4, joinLine5, joinLine6, joinLine7, joinLine8, joinLine9, joinLine10, joinLine11)

    const setLineS = this.svg.snapRoot.line(80 * this.svg.scale, 100 * this.svg.scale, 80 * this.svg.scale, 100 * this.svg.scale + (5 * vOffset1) + (5 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 1,
      'stroke-dasharray': 12 * this.svg.scale + ', ' + 12 * this.svg.scale,
    })
    const setLineR = this.svg.snapRoot.line(280 * this.svg.scale, 100 * this.svg.scale, 280 * this.svg.scale, 100 * this.svg.scale + (6 * vOffset1) + (5 * vOffset2)).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 1,
      'stroke-dasharray': 12 * this.svg.scale + ', ' + 12 * this.svg.scale,
    })
    const setLines = this.svg.snapRoot.group(setLineS, setLineR)

    this.controlTwoSrv = this.svg.snapRoot.circle(80 * this.svg.scale, 100 * this.svg.scale, this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlColour,
      cursor: 'pointer',
    })
    this.controlTwoRcv = this.svg.snapRoot.circle(280 * this.svg.scale, 100 * this.svg.scale + (1 * vOffset1), this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer',
    })

    this.controlOneSrv = this.svg.snapRoot.circle(80 * this.svg.scale, 100 * this.svg.scale + (1 * vOffset1) + (1 * vOffset2), this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourB,
      cursor: 'pointer',
    })
    this.controlOneRcv = this.svg.snapRoot.circle(280 * this.svg.scale, 100 * this.svg.scale + (2 * vOffset1) + (1 * vOffset2), this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourB,
      cursor: 'pointer',
    })

    this.controlSixSrv = this.svg.snapRoot.circle(80 * this.svg.scale, 100 * this.svg.scale + (2 * vOffset1) + (2 * vOffset2), this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer',
    })
    this.controlSixRcv = this.svg.snapRoot.circle(280 * this.svg.scale, 100 * this.svg.scale + (3 * vOffset1) + (2 * vOffset2), this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer',
    })

    this.controlFiveSrv = this.svg.snapRoot.circle(80 * this.svg.scale, 100 * this.svg.scale + (3 * vOffset1) + (3 * vOffset2), this.svg.rotationControlCirleRadius)
    this.controlFiveSrv.attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourB,
      cursor: 'pointer',
    })
    this.controlFiveRcv = this.svg.snapRoot.circle(280 * this.svg.scale, 100 * this.svg.scale + (4 * vOffset1) + (3 * vOffset2), this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourB,
      cursor: 'pointer',
    })

    this.controlFourSrv = this.svg.snapRoot.circle(80 * this.svg.scale, 100 * this.svg.scale + (4 * vOffset1) + (4 * vOffset2), this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer',
    })
    this.controlFourRcv = this.svg.snapRoot.circle(280 * this.svg.scale, 100 * this.svg.scale + (5 * vOffset1) + (4 * vOffset2), this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer',
    })

    this.controlThreeSrv = this.svg.snapRoot.circle(80 * this.svg.scale, 100 * this.svg.scale + (5 * vOffset1) + (5 * vOffset2), this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourB,
      cursor: 'pointer',
    })
    this.controlThreeRcv = this.svg.snapRoot.circle(280 * this.svg.scale, 100 * this.svg.scale + (6 * vOffset1) + (5 * vOffset2), this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourB,
      cursor: 'pointer',
    })
    const controlCircles = this.svg.snapRoot.group(this.controlOneSrv, this.controlTwoSrv, this.controlThreeSrv, this.controlFourSrv, this.controlFiveSrv, this.controlSixSrv,
      this.controlOneRcv, this.controlTwoRcv, this.controlThreeRcv, this.controlFourRcv, this.controlFiveRcv, this.controlSixRcv)

    this.controlTwoRcv.click(() => { this.state.setterAt = 2; this.state.overlapDetectable = true; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveBase); this.move(this.playerPositions.receivingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlTwoSrv.click(() => { this.state.setterAt = 2; if (!this.state.moving) { this.controlSelect(this.state.setterAt, true, this.controlServeBase); this.move(this.playerPositions.servingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlOneRcv.click(() => { this.state.setterAt = 1; this.state.overlapDetectable = true; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveBase); this.move(this.playerPositions.receivingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlOneSrv.click(() => { this.state.setterAt = 1; if (!this.state.moving) { this.controlSelect(this.state.setterAt, true, this.controlServeBase); this.move(this.playerPositions.servingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlSixRcv.click(() => { this.state.setterAt = 6; this.state.overlapDetectable = true; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveBase); this.move(this.playerPositions.receivingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlSixSrv.click(() => { this.state.setterAt = 6; if (!this.state.moving) { this.controlSelect(this.state.setterAt, true, this.controlServeBase); this.move(this.playerPositions.servingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlFiveRcv.click(() => { this.state.setterAt = 5; this.state.overlapDetectable = true; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveBase); this.move(this.playerPositions.receivingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlFiveSrv.click(() => { this.state.setterAt = 5; if (!this.state.moving) { this.controlSelect(this.state.setterAt, true, this.controlServeBase); this.move(this.playerPositions.servingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlFourRcv.click(() => { this.state.setterAt = 4; this.state.overlapDetectable = true; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveBase); this.move(this.playerPositions.receivingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlFourSrv.click(() => { this.state.setterAt = 4; if (!this.state.moving) { this.controlSelect(this.state.setterAt, true, this.controlServeBase); this.move(this.playerPositions.servingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlThreeRcv.click(() => { this.state.setterAt = 3; this.state.overlapDetectable = true; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveBase); this.move(this.playerPositions.receivingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlThreeSrv.click(() => { this.state.setterAt = 3; if (!this.state.moving) { this.controlSelect(this.state.setterAt, true, this.controlServeBase); this.move(this.playerPositions.servingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.rotationControls = this.svg.snapRoot.group(backgroundBoxes, headingLabels, rotationLabels, joinLines, setLines, controlCircles)

    this.rotationControls.transform(`t${1150 * this.svg.scale}, ${50 * this.svg.scale}`)
  }

  drawActionControl() {
    const xOffSet = 220
    const actionBox1 = this.svg.snapRoot.rect(0, 170 * this.svg.scale, xOffSet * this.svg.scale, 450 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB
    })
    const actionBox2 = this.svg.snapRoot.rect(xOffSet * this.svg.scale, 170 * this.svg.scale, xOffSet * this.svg.scale, 450 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourA
    })
    const actionBox3 = this.svg.snapRoot.rect((2 * xOffSet) * this.svg.scale, 170 * this.svg.scale, xOffSet * this.svg.scale, 450 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB
    })
    const actionBox4 = this.svg.snapRoot.rect((3 * xOffSet) * this.svg.scale, 170 * this.svg.scale, xOffSet * this.svg.scale, 450 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourA
    })
    const actionBox5 = this.svg.snapRoot.rect((4 * xOffSet) * this.svg.scale, 170 * this.svg.scale, xOffSet * this.svg.scale, 450 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB
    })
    const actionBoxes = this.svg.snapRoot.group(actionBox1, actionBox2, actionBox3, actionBox4, actionBox5)
    // 990
    // 1240
    const linkBar1 = this.svg.snapRoot.rect((4.5 * xOffSet) * this.svg.scale, 230 * this.svg.scale, (1240 - (4.5 * xOffSet)) * this.svg.scale, 40 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB
    })
    const linkBar2 = this.svg.snapRoot.rect(1200 * this.svg.scale, 120 * this.svg.scale, 40 * this.svg.scale, 150 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB
    })
    const linkBar3 = this.svg.snapRoot.rect((4.5 * xOffSet) * this.svg.scale, 450 * this.svg.scale, (1440 - (4.5 * xOffSet)) * this.svg.scale, 40 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB
    })
    const linkBar4 = this.svg.snapRoot.rect(1400 * this.svg.scale, 120 * this.svg.scale, 40 * this.svg.scale, 370 * this.svg.scale).attr({
      fill: this.colours.rotationControlBackgroundColourB
    })
    const linkLine1 = this.svg.snapRoot.line((xOffSet / 2) * this.svg.scale, 250 * this.svg.scale, 1220 * this.svg.scale, 250 * this.svg.scale).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 1,
      'stroke-dasharray': 12 * this.svg.scale + ', ' + 12 * this.svg.scale
    })
    const linkLine2 = this.svg.snapRoot.line(1220 * this.svg.scale, 250 * this.svg.scale, 1220 * this.svg.scale, this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 1,
      'stroke-dasharray': 12 * this.svg.scale + ', ' + 12 * this.svg.scale
    })
    const linkLine3 = this.svg.snapRoot.line((xOffSet / 2) * this.svg.scale, 470 * this.svg.scale, 1420 * this.svg.scale, 470 * this.svg.scale).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 1,
      'stroke-dasharray': 12 * this.svg.scale + ', ' + 12 * this.svg.scale
    })
    const linkLine4 = this.svg.snapRoot.line(1420 * this.svg.scale, 470 * this.svg.scale, 1420 * this.svg.scale, 20 * this.svg.scale + this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 1,
      'stroke-dasharray': 12 * this.svg.scale + ', ' + 12 * this.svg.scale
    })
    const links = this.svg.snapRoot.group(linkBar1, linkBar2, linkBar3, linkBar4, linkLine1, linkLine2, linkLine3, linkLine4)

    const textHeadingS = this.svg.snapRoot.text(70 * this.svg.scale, 206 * this.svg.scale, this.text[this.language].rotationControl[this.system].serving)
    textHeadingS.attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 28 * this.svg.scale
    })
    const textHeadingR = this.svg.snapRoot.text(80 * this.svg.scale, 416 * this.svg.scale, this.text[this.language].rotationControl[this.system].receiving)
    textHeadingR.attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 28 * this.svg.scale
    })
    const headingLabels = this.svg.snapRoot.group(textHeadingS, textHeadingR)

    this.controlServeBase = this.svg.snapRoot.circle((0.5 * xOffSet) * this.svg.scale, 250 * this.svg.scale, this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlColour,
      cursor: 'pointer'
    })
    this.controlServeServe = this.svg.snapRoot.circle((2.5 * xOffSet) * this.svg.scale, 250 * this.svg.scale, this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer'
    })
    this.controlServeSwitch = this.svg.snapRoot.circle((4.5 * xOffSet) * this.svg.scale, 250 * this.svg.scale, this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer'
    })
    const controlServe = this.svg.snapRoot.group(this.controlServeBase, this.controlServeServe, this.controlServeSwitch)

    this.controlReceiveBase = this.svg.snapRoot.circle((0.5 * xOffSet) * this.svg.scale, 470 * this.svg.scale, this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer'
    })
    this.controlReceiveReceive = this.svg.snapRoot.circle((1.5 * xOffSet) * this.svg.scale, 470 * this.svg.scale, this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer'
    })
    this.controlReceiveSet = this.svg.snapRoot.circle((2.5 * xOffSet) * this.svg.scale, 470 * this.svg.scale, this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer'
    })
    this.controlReceiveHit = this.svg.snapRoot.circle((3.5 * xOffSet) * this.svg.scale, 470 * this.svg.scale, this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer'
    })
    this.controlReceiveSwitch = this.svg.snapRoot.circle((4.5 * xOffSet) * this.svg.scale, 470 * this.svg.scale, this.svg.rotationControlCirleRadius).attr({
      stroke: this.colours.rotationControlColour,
      strokeWidth: 4 * this.svg.scale,
      fill: this.colours.rotationControlBackgroundColourA,
      cursor: 'pointer'
    })
    const controlReceive = this.svg.snapRoot.group(this.controlReceiveBase, this.controlReceiveReceive, this.controlReceiveSet, this.controlReceiveHit, this.controlReceiveSwitch)

    const textLabelS1 = this.multilineText(this.text[this.language].actionControl.servingBase, 36, {
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 36 * this.svg.scale
    }).transform(`t${(0.5 * xOffSet) * this.svg.scale},${330 * this.svg.scale}`)
    const textLabelS2 = this.svg.snapRoot.text((2.5 * xOffSet) * this.svg.scale, 330 * this.svg.scale, this.text[this.language].actionControl.serve).attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 36 * this.svg.scale
    })
    const textLabelS3 = this.svg.snapRoot.text((4.5 * xOffSet) * this.svg.scale, 330 * this.svg.scale, this.text[this.language].actionControl.switch).attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 36 * this.svg.scale
    })
    const textLabelS = this.svg.snapRoot.group(textLabelS1, textLabelS2, textLabelS3)

    const textLabelR1 = this.multilineText(this.text[this.language].actionControl.servingBase, 36, {
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 36 * this.svg.scale
    }).transform(`t${(0.5 * xOffSet) * this.svg.scale}, ${550 * this.svg.scale}`)
    const textLabelR2 = this.svg.snapRoot.text((1.5 * xOffSet) * this.svg.scale, 550 * this.svg.scale, this.text[this.language].actionControl.pass).attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 36 * this.svg.scale
    })
    const textLabelR3 = this.svg.snapRoot.text((2.5 * xOffSet) * this.svg.scale, 550 * this.svg.scale, this.text[this.language].actionControl.set).attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 36 * this.svg.scale
    })
    const textLabelR4 = this.svg.snapRoot.text((3.5 * xOffSet) * this.svg.scale, 550 * this.svg.scale, this.text[this.language].actionControl.attack).attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 36 * this.svg.scale
    })
    const textLabelR5 = this.svg.snapRoot.text((4.5 * xOffSet) * this.svg.scale, 550 * this.svg.scale, this.text[this.language].actionControl.switch).attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 36 * this.svg.scale
    })
    const textLabelR = this.svg.snapRoot.group(textLabelR1, textLabelR2, textLabelR3, textLabelR4, textLabelR5)

    this.controlServeBase.click(() => { this.state.overlapDetectable = false; if (!this.state.moving) { this.controlSelect(this.state.setterAt, true, this.controlServeBase); this.move(this.playerPositions.servingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlServeServe.click(() => { this.state.overlapDetectable = false; if (!this.state.moving) { this.controlSelect(this.state.setterAt, true, this.controlServeServe); this.move(this.playerPositions.servingServe[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlServeSwitch.click(() => { this.state.overlapDetectable = false; if (!this.state.moving) { this.controlSelect(this.state.setterAt, true, this.controlServeSwitch); this.move(this.playerPositions.servingSwitch[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlReceiveBase.click(() => { this.state.overlapDetectable = true; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveBase); this.move(this.playerPositions.receivingBase[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlReceiveReceive.click(() => { this.state.overlapDetectable = true; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveReceive); this.move(this.playerPositions.receivingPass[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlReceiveSet.click(() => { this.state.overlapDetectable = false; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveSet); this.move(this.playerPositions.receivingSet[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlReceiveHit.click(() => { this.state.overlapDetectable = false; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveHit); this.move(this.playerPositions.receivingAttack[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })
    this.controlReceiveSwitch.click(() => { this.state.overlapDetectable = false; if (!this.state.moving) { this.controlSelect(this.state.setterAt, false, this.controlReceiveSwitch); this.move(this.playerPositions.receivingSwitch[this.system][this.state.setterAt], 600).then(() => this.state.moving = false) } })

    this.actionControls = this.svg.snapRoot.group(actionBoxes, links, headingLabels, controlServe, controlReceive, textLabelS, textLabelR)

    this.actionControls.transform(`t${10 * this.svg.scale}, ${950 * this.svg.scale}`)
  }

  controlSelect(setterPos, serving, action) {
    this.controlTwoRcv.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlTwoSrv.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlOneRcv.attr({ fill: this.colours.rotationControlBackgroundColourB })
    this.controlOneSrv.attr({ fill: this.colours.rotationControlBackgroundColourB })
    this.controlSixRcv.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlSixSrv.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlFiveRcv.attr({ fill: this.colours.rotationControlBackgroundColourB })
    this.controlFiveSrv.attr({ fill: this.colours.rotationControlBackgroundColourB })
    this.controlFourRcv.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlFourSrv.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlThreeRcv.attr({ fill: this.colours.rotationControlBackgroundColourB })
    this.controlThreeSrv.attr({ fill: this.colours.rotationControlBackgroundColourB })

    let currentControl
    if (setterPos === 1) {
      currentControl = serving ? this.controlOneSrv : this.controlOneRcv
    }
    else if (setterPos === 2) {
      currentControl = serving ? this.controlTwoSrv : this.controlTwoRcv
    }
    else if (setterPos === 3) {
      currentControl = serving ? this.controlThreeSrv : this.controlThreeRcv
    }
    else if (setterPos === 4) {
      currentControl = serving ? this.controlFourSrv : this.controlFourRcv
    }
    else if (setterPos === 5) {
      currentControl = serving ? this.controlFiveSrv : this.controlFiveRcv
    }
    else if (setterPos === 6) {
      currentControl = serving ? this.controlSixSrv : this.controlSixRcv
    }

    currentControl.attr({ fill: this.colours.rotationControlColour })
    this.actionSelect(action)
  }

  actionSelect(action) {
    this.controlServeBase.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlServeServe.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlServeSwitch.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlReceiveBase.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlReceiveReceive.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlReceiveSet.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlReceiveHit.attr({ fill: this.colours.rotationControlBackgroundColourA })
    this.controlReceiveSwitch.attr({ fill: this.colours.rotationControlBackgroundColourA })
    action.attr({ fill: this.colours.rotationControlColour })
  }

  drawCheckOverlapButton() {
    // Positioned at bottom-right (x: 1110 to 1390), immediately to the left of Tutorial (x: 1410 to 1690)
    const btnBox = this.svg.snapRoot.rect(
//      1110 * this.svg.scale,
//      1480 * this.svg.scale,
      400 * this.svg.scale,
      10 * this.svg.scale,
      300 * this.svg.scale,
      80 * this.svg.scale
    ).attr({
      fill: this.colours.verifyColour,
      rx: 6 * this.svg.scale,
      ry: 6 * this.svg.scale
    });

    const btnText = this.svg.snapRoot.text(
//      1250 * this.svg.scale,
//      1536 * this.svg.scale,
      550 * this.svg.scale,
      60 * this.svg.scale,
      this.text[this.language].checkOverlapBtn
    ).attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 34 * this.svg.scale,
    });

    this.checkOverlapButton = this.svg.snapRoot.group(btnBox, btnText);
    this.checkOverlapButton.attr({ cursor: 'pointer',display: 'none'});

    this.checkOverlapButton.click(() => {
      this.checkOverLapping();
    });
  }

  showCheckOverlapButton() {
    if (this.checkOverlapButton && this.state.overlapDetectable) {
      this.checkOverlapButton.attr({ display: 'inline' });
    }
  }

  hideCheckOverlapButton() {
    if (this.checkOverlapButton) {
      this.checkOverlapButton.attr({ display: 'none' });
    }
  }  

  drawVerifyButton() {
    //if (showVerifyButton) return;  //if already shown

    const verifyButtonBox = this.svg.snapRoot.rect(400 * this.svg.scale, 10 * this.svg.scale, 300 * this.svg.scale, 80 * this.svg.scale)
    verifyButtonBox.attr({
      fill: this.colours.verifyColour
    })
    const verifyButtonText = this.svg.snapRoot.text(550 * this.svg.scale, 60 * this.svg.scale, this.text[this.language].verify)
    verifyButtonText.attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 44 * this.svg.scale,
    })

    this.verifyButton = this.svg.snapRoot.group(verifyButtonBox, verifyButtonText)
    this.verifyButton.attr({ cursor: 'pointer' })
    this.showVerifyButton = true;

    this.verifyButton.click(() => {
      console.log("Cyburi LLC:  verify overlapping");
      alert("Fix the overlapping issue that previously moved.");
    })
  }


  drawTutorialButton() {

    const tutorialButtonBox = this.svg.snapRoot.rect(1410 * this.svg.scale, 1480 * this.svg.scale, 280 * this.svg.scale, 80 * this.svg.scale)
    tutorialButtonBox.attr({
      fill: this.colours.tutorialColour
    })
    const tutorialButtonText = this.svg.snapRoot.text(1550 * this.svg.scale, 1536 * this.svg.scale, this.text[this.language].tutorial[0])
    tutorialButtonText.attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 44 * this.svg.scale,
    })

    this.tutorialButton = this.svg.snapRoot.group(tutorialButtonBox, tutorialButtonText)
    this.tutorialButton.attr({ cursor: 'pointer' })

    this.tutorialButton.click(() => {
      this.drawTutorial(0)
    })
  }

  drawTutorial(index) {
    if (index >= this.tutorialData.length) {
      return
    }

    const p1 = this.svg.snapRoot.path("M0 0 H" + this.svg.width + "V" + this.svg.height + "H0Z " +
      "M" + this.tutorialData[index].boxPosition.right + " " + this.tutorialData[index].boxPosition.top + " " +
      "H" + this.tutorialData[index].boxPosition.left + "V" + this.tutorialData[index].boxPosition.bottom +
      "H" + this.tutorialData[index].boxPosition.right + "Z")

    this.tutorialMask = this.svg.snapRoot.group(p1)
    this.tutorialMask.attr({
      'fill-rule': 'evenodd',
      'fill': this.colours.tutorialFade,
      'fill-opacity': 0.8
    })

    this.tutorialMaskEdge = this.svg.snapRoot.rect(
      this.tutorialData[index].boxPosition.left,
      this.tutorialData[index].boxPosition.top,
      this.tutorialData[index].boxPosition.right - this.tutorialData[index].boxPosition.left,
      this.tutorialData[index].boxPosition.bottom - this.tutorialData[index].boxPosition.top
    )
    this.tutorialMaskEdge.attr({
      stroke: this.colours.tutorialColour,
      fill: 'none'
    })

    const textBox = this.svg.snapRoot.rect(
      this.tutorialData[index].textPosition.left,
      this.tutorialData[index].textPosition.top,
      this.tutorialData[index].textPosition.right - this.tutorialData[index].textPosition.left,
      this.tutorialData[index].textPosition.bottom - this.tutorialData[index].textPosition.top
    )
    textBox.attr({
      fill: this.colours.tutorialColour
    })

    this.tutorialTextBox = this.svg.snapRoot.group(textBox)

    const textChunks = this.tutorialData[index].text.split('\n')
    for (var i = 0; i < textChunks.length; i++) {
      const textLine = this.svg.snapRoot.text(this.tutorialData[index].textPosition.left + (10 * this.svg.scale),
        this.tutorialData[index].textPosition.top + (42 * this.svg.scale) + (i * 40 * this.svg.scale),
        textChunks[i])
      textLine.attr({
        fill: this.colours.rotationControlColour,
        stroke: this.colours.rotationControlColour,
        strokeWidth: 2 * this.svg.scale,
        'text-anchor': 'left',
        'font-family': 'Verdana',
        'font-size': 32 * this.svg.scale,
        cursor: 'pointer',
      })
      this.tutorialTextBox.add(textLine)
    }

    const nextButtonBox = this.svg.snapRoot.rect(
      this.tutorialData[index].nextPosition.left,
      this.tutorialData[index].nextPosition.top,
      240 * this.svg.scale,
      80 * this.svg.scale
    )
    nextButtonBox.attr({
      fill: this.colours.tutorialColour
    })
    const nextButtonText = this.svg.snapRoot.text(this.tutorialData[index].nextPosition.left + 120 * this.svg.scale,
      this.tutorialData[index].nextPosition.top + (56 * this.svg.scale),
      this.text[this.language].tutorial[1]
    )
    nextButtonText.attr({
      fill: this.colours.rotationControlColour,
      stroke: this.colours.rotationControlColour,
      strokeWidth: 2 * this.svg.scale,
      'text-anchor': 'middle',
      'font-family': 'Verdana',
      'font-size': 44 * this.svg.scale,
      cursor: 'pointer',
    })

    this.tutorialNextButton = this.svg.snapRoot.group(nextButtonBox, nextButtonText)
    this.tutorialNextButton.attr({ cursor: 'pointer' })

    this.tutorialNextButton.click(() => {
      this.tutorialMask.remove()
      this.tutorialTextBox.remove()
      this.tutorialNextButton.remove()
      this.tutorialMaskEdge.remove()
      this.drawTutorial(index + 1)
    })
  }

  move(players, time) {
    this.state.moving = true
    this.hideCheckOverlapButton() // Hide button when auto-moving to preset positions

    this.players.s.setPosition(players.s.x, players.s.y)
    this.players.o.setPosition(players.o.x, players.o.y)
    this.players.m2.setPosition(players.m2.x, players.m2.y)
    this.players.m1.setPosition(players.m1.x, players.m1.y)
    this.players.h1.setPosition(players.h1.x, players.h1.y)
    this.players.h2.setPosition(players.h2.x, players.h2.y)
    this.players.l.setPosition(players.l.x, players.l.y)

    return this.court.draw()
  }

  checkOverLapping() {
    //Check only if the manual movement is at state of receiving.
    //which player just moved  //if can't tell from here since the move happen within draw context
    //For each rotation
    //Go throw each players and check for each playing

    if (!this.state.overlapDetectable) {
      alert(this.text[this.language].overlapNotApplicable);
      return;
    }    

    //Rotation 1
    if (this.state.setterAt == 1) {
      if (this.system == 51 || this.system == '51b' || this.system == 62 || this.system == '62b' || this.system == 42) {
        if (this.checkZone1(this.players.s, this.players.h1, this.players.l)) {
          return;
        }
        if (this.checkZone2(this.players.h1, this.players.s, this.players.m2)) {
          return;
        }
        if (this.checkZone3(this.players.m2, this.players.h1, this.players.o, this.players.l)) {
          return;
        }
        if (this.checkZone4(this.players.o, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone5(this.players.h2, this.players.o, this.players.l)) {
          return;
        }
        if (this.checkZone6(this.players.l, this.players.s, this.players.m2, this.players.h2)) {
          return;
        }
      } else if (this.system == '3M') {
        if (this.checkZone1(this.players.s, this.players.h1, this.players.m1)) {
          return;
        }
        if (this.checkZone2(this.players.h1, this.players.s, this.players.m2)) {
          return;
        }
        if (this.checkZone3(this.players.m2, this.players.h1, this.players.o, this.players.m1)) {
          return;
        }
        if (this.checkZone4(this.players.o, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone5(this.players.h2, this.players.o, this.players.m1)) {
          return;
        }
        if (this.checkZone6(this.players.m1, this.players.s, this.players.m2, this.players.h2)) {
          return;
        }
      } else if (this.system == 63) {
        if (this.checkZone1(this.players.s, this.players.h1, this.players.l)) {
          return;
        }
        if (this.checkZone2(this.players.h1, this.players.s, this.players.m2)) {
          return;
        }
        if (this.checkZone3(this.players.m2, this.players.h1, this.players.o, this.players.l)) {
          return;
        }
        if (this.checkZone4(this.players.o, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone5(this.players.h2, this.players.o, this.players.l)) {
          return;
        }
        if (this.checkZone6(this.players.l, this.players.s, this.players.m2, this.players.h2)) {
          return;
        }
      }
    } else if (this.state.setterAt == 6) { //rotation 2

      if (this.system == 51 || this.system == '51b' || this.system == 62 || this.system == '62b' || this.system == 42) {
        if (this.checkZone1(this.players.h1, this.players.m2, this.players.s)) {
          return;
        }
        if (this.checkZone2(this.players.m2, this.players.h1, this.players.o)) {
          return;
        }
        if (this.checkZone3(this.players.o, this.players.m2, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone4(this.players.h2, this.players.o, this.players.l)) {
          return;
        }
        if (this.checkZone5(this.players.l, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone6(this.players.s, this.players.h1, this.players.o, this.players.l)) {
          return;
        }
      } else if (this.system == '3M') {
        if (this.checkZone1(this.players.h1, this.players.m2, this.players.s)) {
          return;
        }
        if (this.checkZone2(this.players.m2, this.players.h1, this.players.o)) {
          return;
        }
        if (this.checkZone3(this.players.o, this.players.m2, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone4(this.players.h2, this.players.o, this.players.m1)) {
          return;
        }
        if (this.checkZone5(this.players.m1, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone6(this.players.s, this.players.h1, this.players.o, this.players.m1)) {
          return;
        }
      } else if (this.system == 63) {
        if (this.checkZone1(this.players.h1, this.players.m2, this.players.s)) {
          return;
        }
        if (this.checkZone2(this.players.m2, this.players.h1, this.players.o)) {
          return;
        }
        if (this.checkZone3(this.players.o, this.players.m2, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone4(this.players.h2, this.players.o, this.players.l)) {
          return;
        }
        if (this.checkZone5(this.players.l, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone6(this.players.s, this.players.h1, this.players.o, this.players.l)) {
          return;
        }
      }

    } else if (this.state.setterAt == 5) { //rotation 3
      if (this.system == 51 || this.system == '51b' || this.system == 62 || this.system == '62b' ||this.system == 42) {
        if (this.checkZone1(this.players.l, this.players.o, this.players.h1)) {
          return;
        }
        if (this.checkZone2(this.players.o, this.players.l, this.players.h2)) {
          return;
        }
        if (this.checkZone3(this.players.h2, this.players.o, this.players.m1, this.players.h1)) {
          return;
        }
        if (this.checkZone4(this.players.m1, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone5(this.players.s, this.players.m1, this.players.h1)) {
          return;
        }
        if (this.checkZone6(this.players.h1, this.players.l, this.players.h2, this.players.s)) {
          return;
        }
      } else if (this.system == '3M') {  //m2<-h1; m3<-O;h1<-m2;
        if (this.checkZone1(this.players.m2, this.players.o, this.players.h1)) {
          return;
        }
        if (this.checkZone2(this.players.o, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone3(this.players.h2, this.players.o, this.players.m1, this.players.h1)) {
          return;
        }
        if (this.checkZone4(this.players.m1, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone5(this.players.s, this.players.m1, this.players.h1)) {
          return;
        }
        if (this.checkZone6(this.players.h1, this.players.m2, this.players.h2, this.players.s)) {
          return;
        }
      } else if (this.system == 63) {
        if (this.checkZone1(this.players.m2, this.players.o, this.players.h1)) {
          return;
        }
        if (this.checkZone2(this.players.o, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone3(this.players.h2, this.players.o, this.players.m1, this.players.h1)) {
          return;
        }
        if (this.checkZone4(this.players.m1, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone5(this.players.s, this.players.m1, this.players.h1)) {
          return;
        }
        if (this.checkZone6(this.players.h1, this.players.m2, this.players.h2, this.players.s)) {
          return;
        }
      }
    } else if (this.state.setterAt == 4) { //rotation 4
      if (this.system == 51 ||this.system == '51b' || this.system == 62 ||this.system == '62b' || this.system == 42) {
        if (this.checkZone1(this.players.o, this.players.h2, this.players.l)) {
          return;
        }
        if (this.checkZone2(this.players.h2, this.players.o, this.players.m1)) {
          return;
        }
        if (this.checkZone3(this.players.m1, this.players.h2, this.players.s, this.players.l)) {
          return;
        }
        if (this.checkZone4(this.players.s, this.players.m1, this.players.h1)) {
          return;
        }
        if (this.checkZone5(this.players.h1, this.players.s, this.players.l)) {
          return;
        }
        if (this.checkZone6(this.players.l, this.players.o, this.players.m1, this.players.h1)) {
          return;
        }
      } else if (this.system == '3M') {
        if (this.checkZone1(this.players.l, this.players.h2, this.players.m2)) {
          return;
        }
        if (this.checkZone2(this.players.h2, this.players.l, this.players.m1)) {
          return;
        }
        if (this.checkZone3(this.players.m1, this.players.h2, this.players.s, this.players.m2)) {
          return;
        }
        if (this.checkZone4(this.players.s, this.players.m1, this.players.h1)) {
          return;
        }
        if (this.checkZone5(this.players.h1, this.players.s, this.players.m2)) {
          return;
        }
        if (this.checkZone6(this.players.m2, this.players.l, this.players.m1, this.players.h1)) {
          return;
        }
      } else if (this.system == 63) {
        if (this.checkZone1(this.players.o, this.players.h2, this.players.m2)) {
          return;
        }
        if (this.checkZone2(this.players.h2, this.players.o, this.players.m1)) {
          return;
        }
        if (this.checkZone3(this.players.m1, this.players.h2, this.players.s, this.players.m2)) {
          return;
        }
        if (this.checkZone4(this.players.s, this.players.m1, this.players.h1)) {
          return;
        }
        if (this.checkZone5(this.players.h1, this.players.s, this.players.m2)) {
          return;
        }
        if (this.checkZone6(this.players.m2, this.players.o, this.players.m1, this.players.h1)) {
          return;
        }
      }
    } else if (this.state.setterAt == 3) { //rotation 5
      if (this.system == 62 ||this.system == '62b' || this.system == 51 || this.system == '51b' ||this.system == 42) {
        if (this.checkZone1(this.players.h2, this.players.m1, this.players.o)) {
          return;
        }
        if (this.checkZone2(this.players.m1, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone3(this.players.s, this.players.m1, this.players.h1, this.players.o)) {
          return;
        }
        if (this.checkZone4(this.players.h1, this.players.s, this.players.l)) {
          return;
        }
        if (this.checkZone5(this.players.l, this.players.h1, this.players.o)) {
          return;
        }
        if (this.checkZone6(this.players.o, this.players.h2, this.players.s, this.players.l)) {
          return;
        }
      } else if (this.system == '3M') {
        if (this.checkZone1(this.players.h2, this.players.m1, this.players.l)) {
          return;
        }
        if (this.checkZone2(this.players.m1, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone3(this.players.s, this.players.m1, this.players.h1, this.players.l)) {
          return;
        }
        if (this.checkZone4(this.players.h1, this.players.s, this.players.m2)) {
          return;
        }
        if (this.checkZone5(this.players.m2, this.players.h1, this.players.l)) {
          return;
        }
        if (this.checkZone6(this.players.l, this.players.h2, this.players.s, this.players.m2)) {
          return;
        }
      } else if (this.system == 63) {
        if (this.checkZone1(this.players.h2, this.players.m1, this.players.o)) {
          return;
        }
        if (this.checkZone2(this.players.m1, this.players.h2, this.players.s)) {
          return;
        }
        if (this.checkZone3(this.players.s, this.players.m1, this.players.h1, this.players.o)) {
          return;
        }
        if (this.checkZone4(this.players.h1, this.players.s, this.players.m2)) {
          return;
        }
        if (this.checkZone5(this.players.m2, this.players.h1, this.players.o)) {
          return;
        }
        if (this.checkZone6(this.players.o, this.players.h2, this.players.s, this.players.m2)) {
          return;
        }
      }
    } else if (this.state.setterAt == 2) { //rotation 6
      if (this.system == 62 ||this.system == '62b' || this.system == 51 || this.system == '51b' || this.system == 42) {
        if (this.checkZone1(this.players.l, this.players.s, this.players.h2)) {
          return;
        }
        if (this.checkZone2(this.players.s, this.players.l, this.players.h1)) {
          return;
        }
        if (this.checkZone3(this.players.h1, this.players.s, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone4(this.players.m2, this.players.h1, this.players.o)) {
          return;
        }
        if (this.checkZone5(this.players.o, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone6(this.players.h2, this.players.l, this.players.h1, this.players.o)) {
          return;
        }
      } else if (this.system == '3M') {
        if (this.checkZone1(this.players.m1, this.players.s, this.players.h2)) {
          return;
        }
        if (this.checkZone2(this.players.s, this.players.m1, this.players.h1)) {
          return;
        }
        if (this.checkZone3(this.players.h1, this.players.s, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone4(this.players.m2, this.players.h1, this.players.l)) {
          return;
        }
        if (this.checkZone5(this.players.l, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone6(this.players.h2, this.players.m1, this.players.h1, this.players.l)) {
          return;
        }
      } else if (this.system == 63) {
        if (this.checkZone1(this.players.l, this.players.s, this.players.h2)) {
          return;
        }
        if (this.checkZone2(this.players.s, this.players.l, this.players.h1)) {
          return;
        }
        if (this.checkZone3(this.players.h1, this.players.s, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone4(this.players.m2, this.players.h1, this.players.o)) {
          return;
        }
        if (this.checkZone5(this.players.o, this.players.m2, this.players.h2)) {
          return;
        }
        if (this.checkZone6(this.players.h2, this.players.l, this.players.h1, this.players.o)) {
          return;
        }
      }
    }
    alert(this.text[this.language].noOverlap);
  }


  checkZone4(p4, p3, p5) {  //player1=>zn3 and player3 =>zn5
    // check for overlapped to see if the adj players overlap
    if (p3.courtObject.getBBox().x < p4.courtObject.getBBox().x) { //overlaps 
      alert(this.text[this.language].verify + p3.label + " and " + p4.label);
      return true;
    }
    else if (p5.courtObject.getBBox().y < p4.courtObject.getBBox().y) {
      alert(this.text[this.language].verify + p5.label + " and " + p4.label);
      return true;
    }
    return false;
  }

  checkZone3(p3, p2, p4, p6) {  //player1=>zn4 and player3 =>zn2
    // check for overlapped to see if the adj players overlap
    if (p4.courtObject.getBBox().x > p3.courtObject.getBBox().x) {  //overlaps 
      alert(this.text[this.language].verify + p3.label + " and " + p4.label);
      return true;
    } else if (p2.courtObject.getBBox().x < p3.courtObject.getBBox().x) {
      alert(this.text[this.language].verify + p2.label + " and " + p3.label);
      return true;
    } else if (p6.courtObject.getBBox().y < p3.courtObject.getBBox().y) {
      alert(this.text[this.language].verify + p6.label + " and " + p3.label);
      return true;
    }
    return false;
  }

  checkZone6(p6, p1, p3, p5) {
    // check for overlapped to see if the adj players overlap
    if (p5.courtObject.getBBox().x > p6.courtObject.getBBox().x) { //overlaps 
      alert(this.text[this.language].verify + p5.label + " and " + p6.label);
      return true;
    } else if (p1.courtObject.getBBox().x < p6.courtObject.getBBox().x) {
      alert(this.text[this.language].verify + p1.label + " and " + p6.label);
      return true;
    } else if (p3.courtObject.getBBox().y > p6.courtObject.getBBox().y) {
      alert(this.text[this.language].verify + p6.label + " and " + p3.label);
      return true;
    }
    return false;
  }
  checkZone5(p5, p4, p6) {
    // check for overlapped to see if the adj players overlap
    if (p6.courtObject.getBBox().x < p5.courtObject.getBBox().x) { //overlaps 
      alert(this.text[this.language].verify + p5.label + " and " + p6.label);
      return true;
    } else if (p4.courtObject.getBBox().y > p5.courtObject.getBBox().y) {
      alert(this.text[this.language].verify + p5.label + " and " + p4.label);
      return true;
    }
    return false;
  }
  checkZone2(p2, p1, p3) {
    // check for overlapped to see if the adj players overlap
    if (p3.courtObject.getBBox().x > p2.courtObject.getBBox().x) { //overlaps 
      alert(this.text[this.language].verify + p2.label + " and " + p3.label);
      return true;
    } else if (p1.courtObject.getBBox().y < p2.courtObject.getBBox().y) {
      alert(this.text[this.language].verify + p1.label + " and " + p2.label);
      return true;
    }
    return false;
  }
  checkZone1(p1, p2, p6) {  //zn1; and adj zn6 zn2
    // check for overlapped to see if the adj players to player in z1
    if (p6.courtObject.getBBox().x > p1.courtObject.getBBox().x) { //overlaps 
      alert(this.text[this.language].verify + p6.label + " and " + p1.label);
      return true;
    } else if (p2.courtObject.getBBox().y > p1.courtObject.getBBox().y) {
      alert(this.text[this.language].verify + p2.label + " and " + p1.label);
      return true;
    }
    return false;
  }
}


var showVerifyButton = true;


var move = function (dx, dy) {
  this.attr({
    transform: this.data('origTransform') + (this.data('origTransform') ? "T" : "t") + [dx, dy]
  });
}

var start = function () {
  this.data('origTransform', this.transform().local);
}

var stop = function () {
  console.log('finished dragging inside vbTutorial module');

  // Show the check overlap button only if currently in receive mode
    vbTutorial.showCheckOverlapButton();
  //vbTutorial.checkOverLapping(); //check for overlapping now manually

}

