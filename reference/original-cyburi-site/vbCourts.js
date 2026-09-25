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

class VBCourt {
  NS = 'http://www.w3.org/2000/svg'

  /*
   * We have an internal coordinate system that defines one side of the court as 900 x 900 "units",
   * which simplifies creating the player position detail as being within that (0,0)-(900,900) box.
   * We then have a border of 120 units, which means that the diagram is 1140 units wide, with:
   * - a half-court drawn from (120,120) top-left to (1040,1040) bottom-right, total height 1140 units
   * - a full-court drawn from (120,120) top-left to (1040,1940) bottom-right, total height 2040 units
   *
   * There is therefore a scaling factor of {image-width} / 1140, with a default image width of 600px.
   * The half court has a height equal to the width, and the full court has a height 2040/1140 * the width.
   *
   * We could use a transformation, but I'd rather have the final SVG to be "clean"
   */

  constructor(config = {}) {
      const svgWidth = (typeof config.width === 'number') ? config.width : 600
      this.svg = {
          width: svgWidth,
          height: svgWidth,
          scale: svgWidth / 1140,
      }

      this.colours = {
          backgroundColour: (config.colours && typeof config.colours.backgroundColour === 'string') ? config.colours.backgroundColour : '#63b6e0',
          courtColour: (config.colours && typeof config.colours.courtColour === 'string') ? config.colours.courtColour : '#ffb591',
          lineColour: (config.colours && typeof config.colours.lineColour === 'string') ? config.colours.lineColour : '#ffffff',
      }

      this.players = []
      this.balls = []
      this.carts = []     
      this.coaches = []    

      this.coverageAreas = []; // Add this to store coverage area
      this.drawing = false
      this.allowedDragging = (typeof config.draggable === 'boolean') ? config.draggable : false;
      this.drawingPromise = false
  }

  getSVG() {
      return this.svg.svgRoot
  }

  addPlayer(x, y, label) {
      const player = new Player({ x: x, y: y, label: label }, { fullCourt: this instanceof VBFullCourt }, this.svg)
      player.allowedDragging = this.allowedDragging;
      this.players.push(player)
      return player
  }

  addBall(x, y) {
      
      const ball = new Ball({ x: x, y: y }, { fullCourt: this instanceof VBFullCourt }, this.svg)
      this.balls.push(ball)
      return ball
  }

  // Built-in Ball Cart Method
  addBallCart(x, y, label) {
      if (!this.carts) this.carts = [];
      const cart = new BallCart({ x: x, y: y, label: label }, { fullCourt: this instanceof VBFullCourt }, this.svg)
      this.carts.push(cart)
      return cart
  }

  // Built-in Coach Method
  addCoach(x, y, label) {
      if (!this.coaches) this.coaches = []; 
      const coach = new Coach({ x: x, y: y, label: label }, { fullCourt: this instanceof VBFullCourt }, this.svg)
      coach.allowedDragging = this.allowedDragging;
      this.coaches.push(coach)
      return coach
  }  

  addCoverageArea(x, y, width, height, colour) {
      const area = new CoverageArea({x: x, y: y, width: width, height: height, colour: colour}, {fullCourt: this instanceof VBFullCourt}, this.svg);
      this.coverageAreas.push(area);
      return area;
  }

  clearCoverageAreas() {
      for (let i = 0; i < this.coverageAreas.length; i++) {
          this.coverageAreas[i].remove();
      }
      this.coverageAreas = [];
  }
  
  async draw(time) {
      if (!this.drawing) {
          this.drawing = true
          this.drawCourt()

          // Ensure groups are created *before* adding elements
          if (!this.coverageGroup) {
              this.coverageGroup = this.svg.snapRoot.group();
          }
          if (!this.playerGroup) {
              this.playerGroup = this.svg.snapRoot.group();
          }
          if (!this.ballGroup) {
              this.ballGroup = this.svg.snapRoot.group();
          }
          if (!this.cartGroup) this.cartGroup = this.svg.snapRoot.group();        
          if (!this.coachGroup) this.coachGroup = this.svg.snapRoot.group();                

          // Clear groups before re-adding elements
          this.coverageGroup.clear();
          this.cartGroup.clear();   
          this.coachGroup.clear();            
          this.playerGroup.clear();
          this.ballGroup.clear();
        
          const elementsDrawn = []
          const drawTime = typeof time === 'number' ? time : 500
          this.coverageAreas.forEach(area => elementsDrawn.push(area.draw(drawTime))); //draw coverage area
          this.carts.forEach(cart => elementsDrawn.push(cart.draw(drawTime)));       
          this.coaches.forEach(coach => elementsDrawn.push(coach.draw(drawTime)));   
          this.balls.forEach(ball => elementsDrawn.push(ball.draw(drawTime)))
          this.players.forEach(player => elementsDrawn.push(player.draw(drawTime)))
          this.drawingPromise = Promise.all(elementsDrawn)
          this.drawingPromise.then(() => {
              this.drawing = false
          })

          // Add elements to groups
          this.coverageAreas.forEach(area => this.coverageGroup.add(area.courtObject));
          this.carts.forEach(cart => this.cartGroup.add(cart.courtObject));          
          this.coaches.forEach(coach => this.coachGroup.add(coach.courtObject));      
          this.balls.forEach(ball => this.ballGroup.add(ball.courtObject));
          this.players.forEach(player => this.playerGroup.add(player.courtObject));

          // Ensure groups are appended in the correct order
          this.svg.snapRoot.append(this.coverageGroup);
          this.svg.snapRoot.append(this.cartGroup);   
          this.svg.snapRoot.append(this.coachGroup);  
          this.svg.snapRoot.append(this.playerGroup);          
          this.svg.snapRoot.append(this.ballGroup);
      }
      return this.drawingPromise
  }
}

class VBHalfCourt extends VBCourt {
  constructor(config) {
      super(config)
      this.svg.svgRoot = document.createElementNS(this.NS, 'svg')
      this.svg.svgRoot.setAttribute('width', this.svg.width)
      this.svg.svgRoot.setAttribute('height', this.svg.height)
      this.svg.snapRoot = Snap(this.svg.svgRoot)
  }

  drawCourt() {
      if (this.drawn) {
          return
      }
      this.drawn = true
      const background = this.svg.snapRoot.rect(0, 0, this.svg.width, this.svg.height)
      background.attr({
          fill: this.colours.backgroundColour,
      })
      const outerLines = this.svg.snapRoot.rect(120 * this.svg.scale, 120 * this.svg.scale, 900 * this.svg.scale, 900 * this.svg.scale)
      outerLines.attr({
          fill: this.colours.courtColour,
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
      })
      const centreLine = this.svg.snapRoot.line(50 * this.svg.scale, 120 * this.svg.scale, 1090 * this.svg.scale, 120 * this.svg.scale)
      centreLine.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
      })
      const attackLine = this.svg.snapRoot.line(120 * this.svg.scale, 400 * this.svg.scale, 1020 * this.svg.scale, 400 * this.svg.scale)
      attackLine.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
      })
      const leftTicks = this.svg.snapRoot.line(20 * this.svg.scale, 400 * this.svg.scale, 120 * this.svg.scale, 400 * this.svg.scale)
      leftTicks.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
          'stroke-dasharray': (20 * this.svg.scale) + ', ' + (16 * this.svg.scale)
      })
      const rightTicks = this.svg.snapRoot.line(1120 * this.svg.scale, 400 * this.svg.scale, 1020 * this.svg.scale, 400 * this.svg.scale)
      rightTicks.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
          'stroke-dasharray': (20 * this.svg.scale) + ', ' + (16 * this.svg.scale),
      })
  }
}

class VBFullCourt extends VBCourt {
  /*
   * For a full court, the height is 20/11 * image width
   */
  constructor(config) {
      super(config)
      this.svg.height = this.svg.width * (204 / 114)
      this.svg.svgRoot = document.createElementNS(this.NS, 'svg')
      this.svg.svgRoot.setAttribute('width', this.svg.width)
      this.svg.svgRoot.setAttribute('height', this.svg.height)
      this.svg.snapRoot = Snap(this.svg.svgRoot)
  }

  drawCourt() {
      if (this.drawn) {
          return
      }
      this.drawn = true
      const background = this.svg.snapRoot.rect(0, 0, this.svg.width, this.svg.height)
      background.attr({
          fill: this.colours.backgroundColour,
      })
      const outerLines = this.svg.snapRoot.rect(120 * this.svg.scale, 120 * this.svg.scale, 900 * this.svg.scale, 1800 * this.svg.scale)
      outerLines.attr({
          fill: this.colours.courtColour,
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
      })
      const centreLine = this.svg.snapRoot.line(50 * this.svg.scale, 1020 * this.svg.scale, 1070 * this.svg.scale, 1020 * this.svg.scale)
      centreLine.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
      })
      const attackLine1 = this.svg.snapRoot.line(120 * this.svg.scale, 720 * this.svg.scale, 1020 * this.svg.scale, 720 * this.svg.scale)
      attackLine1.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
      })
      const attackLine2 = this.svg.snapRoot.line(120 * this.svg.scale, 1320 * this.svg.scale, 1020 * this.svg.scale, 1320 * this.svg.scale)
      attackLine2.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
      })
      const leftTicks1 = this.svg.snapRoot.line(20 * this.svg.scale, 720 * this.svg.scale, 120 * this.svg.scale, 720 * this.svg.scale)
      leftTicks1.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
          'stroke-dasharray': (16 * this.svg.scale) + ', ' + (15 * this.svg.scale)
      })
      const leftTicks2 = this.svg.snapRoot.line(20 * this.svg.scale, 1320 * this.svg.scale, 120 * this.svg.scale, 1320 * this.svg.scale)
      leftTicks2.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
          'stroke-dasharray': (16 * this.svg.scale) + ', ' + (15 * this.svg.scale)
      })
      const rightTicks1 = this.svg.snapRoot.line(1220 * this.svg.scale, 720 * this.svg.scale, 1020 * this.svg.scale, 720 * this.svg.scale)
      rightTicks1.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
          'stroke-dasharray': (16 * this.svg.scale) + ', ' + (15 * this.svg.scale),
      })
      const rightTicks2 = this.svg.snapRoot.line(1220 * this.svg.scale, 1320 * this.svg.scale, 1020 * this.svg.scale, 1320 * this.svg.scale)
      rightTicks2.attr({
          stroke: this.colours.lineColour,
          strokeWidth: 8 * this.svg.scale,
          'stroke-dasharray': (16 * this.svg.scale) + ', ' + (15 * this.svg.scale),
      })
  }
}

class VB2ThinCourt extends VBFullCourt {
  drawCourt() {
      super.drawCourt()
      const thinLine = this.svg.snapRoot.line(this.svg.width / 2, 0, this.svg.width / 2, 2040 * this.svg.scale)
      thinLine.attr({
          stroke: 'white',
          strokeWidth: 8 * this.svg.scale,
          'stroke-dasharray': (16 * this.svg.scale) + ', ' + (15 * this.svg.scale),
      })

  }
}

class CourtObject {
  constructor(objectConfig, courtConfig, svgConfig) {
      this.svg = {
          snapRoot: svgConfig.snapRoot,
          scale: svgConfig.scale
      }
      this.pos = { x: 0, y: 0, fullCourt: courtConfig.fullCourt }
      this.setPosition(objectConfig.x ? objectConfig.x : 0, objectConfig.y ? objectConfig.y : 0)
      this.movePending = false
      this.allowedDragging = false;
  }

  setPosition(x, y) {
      this.pos.x = (x + 120) * this.svg.scale
      if (this.pos.fullCourt) {
          this.pos.y = (y + 1020) * this.svg.scale
      } else {
          this.pos.y = (y + 120) * this.svg.scale
      }
      this.movePending = true
  }

  async draw(time) {
      if (this.movePending) {
          return new Promise((resolve, reject) => {
              this.courtObject.animate({ transform: `translate(${this.pos.x}, ${this.pos.y})` }, time, null, resolve)
          })
      } else {
          this.courtObject.transform(`translate(${this.pos.x}, ${this.pos.y})`)
          return Promise.resolve()
      }
  }
   remove() {
        if (this.courtObject) {
            this.courtObject.remove();
        }
    }
}

class Player extends CourtObject {
  stopcallback = () => { console.log("Cyburi LLC - Player.stopcallback called"); };

  constructor(playerConfig, courtConfig, svgConfig) {
      super(playerConfig, courtConfig, svgConfig)
      this.label = playerConfig.label ? playerConfig.label : 'X'
      this.highlighted = false
      this.dragging = false;
      this.colours = {
          playerOutlineColour: (playerConfig.colours && typeof playerConfig.colours.playerOutlineColour === 'string') ? playerConfig.colours.playerOutlineColour : '#f5f5f5',
          playerColour: (playerConfig.colours && typeof playerConfig.colours.playerColour === 'string') ? playerConfig.colours.playerColour : '#efa581',
          playerColourHighlight: (playerConfig.colours && typeof playerConfig.colours.playerColourHighlight === 'string') ? playerConfig.colours.playerColourHighlight : '#66dd66',
      }
  }

  setLabel(lbl) {
      this.label = lbl;
      this.courtObject[1].attr({ text: this.label });
  }

  setPlayerColour(playerColour) {
    this.colours.playerColour = playerColour;
  }

  async draw(time) {
      if (!this.drawn) {
          this.circle = this.svg.snapRoot.circle(0, 0, 54 * this.svg.scale)
          this.circle.attr({
              stroke: this.colours.playerOutlineColour,
              strokeWidth: 5 * this.svg.scale,
              fill: this.colours.playerColour,
          })
          const label = this.svg.snapRoot.text(0, 0, this.label)
          label.attr({
              fill: this.colours.playerOutlineColour,
              stroke: this.colours.playerOutlineColour,
              strokeWidth: 5 * this.svg.scale,
              'text-anchor': 'middle',
              'dominant-baseline': 'central',
              'font-family': 'Verdana',
              'font-size': 55 * this.svg.scale,
          })
          this.courtObject = this.svg.snapRoot.group(this.circle, label)
          if (this.allowedDragging) {
              this.courtObject.attr({ cursor: 'move' })
              this.courtObject.drag(move, start, stop);
          }
          //this.courtObject.click(() => { this.toggleHighlight() })
          this.courtObject.dblclick(() => { this.toggleHighlight() })
          this.drawn = true
      }
      return CourtObject.prototype.draw.call(this, time)
  }


  setDragCallbacks(move, start, stop) {
      console.log('setting callbacks for drag player object');
      this.courtObject.drag(move, start, stop);
  }


  toggleHighlight() {
      if (this.highlighted) {
          this.circle.attr({ fill: this.colours.playerColour })
      } else {
          this.circle.attr({ fill: this.colours.playerColourHighlight })
      }
      this.highlighted = !this.highlighted
  }
}

var move = function (dx, dy) {
  this.attr({
      transform: this.data('origTransform') + (this.data('origTransform') ? "T" : "t") + [dx, dy]
  });
}

var start = function () {
  this.data('origTransform', this.transform().local);
}
var stop = function () {
  console.log('finished dragging');
}


// ----------------------------------------------------
// CLASS: Coach
// Distinct dark navy body with gold outline
// ----------------------------------------------------
class Coach extends CourtObject {
  constructor(coachConfig, courtConfig, svgConfig) {
      super(coachConfig, courtConfig, svgConfig);
      this.label = coachConfig.label ? coachConfig.label : 'C';
      this.colours = {
          coachOutlineColour: (coachConfig.colours && typeof coachConfig.colours.coachOutlineColour === 'string') ? coachConfig.colours.coachOutlineColour : '#f1c40f', // Gold outline
          coachColour: (coachConfig.colours && typeof coachConfig.colours.coachColour === 'string') ? coachConfig.colours.coachColour : '#2c3e50',               // Dark Navy body
      };
  }

  async draw(time) {
      if (!this.drawn) {
          const s = this.svg.scale;
          this.circle = this.svg.snapRoot.circle(0, 0, 58 * s);
          this.circle.attr({
              stroke: this.colours.coachOutlineColour,
              strokeWidth: 6 * s,
              fill: this.colours.coachColour,
          });
          const label = this.svg.snapRoot.text(0, 0, this.label);
          label.attr({
              fill: this.colours.coachOutlineColour,
              stroke: this.colours.coachOutlineColour,
              strokeWidth: 3 * s,
              'text-anchor': 'middle',
              'dominant-baseline': 'central',
              'font-family': 'Verdana',
              'font-weight': 'bold',
              'font-size': 52 * s,
          });
          this.courtObject = this.svg.snapRoot.group(this.circle, label);
          if (this.allowedDragging) {
              this.courtObject.attr({ cursor: 'move' });
              this.courtObject.drag(move, start, stop);
          }
          this.drawn = true;
      }
      return CourtObject.prototype.draw.call(this, time);
  }
}

// ----------------------------------------------------
// CLASS: BallCart
// Metallic orange basket with mini volleyballs
// ----------------------------------------------------
class BallCart extends CourtObject {
  constructor(cartConfig, courtConfig, svgConfig) {
      super(cartConfig, courtConfig, svgConfig);
      this.label = cartConfig.label || 'CART';
  }

  async draw(time) {
      if (!this.drawn) {
          const s = this.svg.scale;
          const rect = this.svg.snapRoot.rect(-35 * s, -25 * s, 70 * s, 50 * s, 6 * s).attr({
              fill: '#f39c12',
              stroke: '#2c3e50',
              strokeWidth: 3 * s
          });
          const b1 = this.svg.snapRoot.circle(-12 * s, -8 * s, 8 * s).attr({ fill: '#ffffff', stroke: '#000000', strokeWidth: 1.5 * s });
          const b2 = this.svg.snapRoot.circle(12 * s, -8 * s, 8 * s).attr({ fill: '#ffffff', stroke: '#000000', strokeWidth: 1.5 * s });
          const b3 = this.svg.snapRoot.circle(0, 10 * s, 8 * s).attr({ fill: '#ffffff', stroke: '#000000', strokeWidth: 1.5 * s });
          const txt = this.svg.snapRoot.text(0, 48 * s, this.label).attr({
              fill: '#ffffff',
              'text-anchor': 'middle',
              'dominant-baseline': 'central',
              'font-family': 'Verdana',
              'font-weight': 'bold',
              'font-size': 20 * s
          });
          this.courtObject = this.svg.snapRoot.group(rect, b1, b2, b3, txt);
          this.drawn = true;
      }
      return CourtObject.prototype.draw.call(this, time);
  }
}


class Ball extends CourtObject {
  constructor(ballConfig, courtConfig, svgConfig) {
      super(ballConfig, courtConfig, svgConfig)
      this.colours = {
          ballOutlineColour: (ballConfig.colours && typeof ballConfig.colours.ballOutlineColour === 'string') ? ballConfig.colours.ballOutlineColour : '#1962ff',
          ballColour: (ballConfig.colours && typeof ballConfig.colours.ballColour === 'string') ? ballConfig.colours.ballColour : '#fffb00',
      }
  }

  async draw(time) {
      if (!this.drawn) {
          this.circle = this.svg.snapRoot.circle(0, 0, 20 * this.svg.scale)
          this.circle.attr({
              stroke: this.colours.ballOutlineColour,
              strokeWidth: 2 * this.svg.scale,
              fill: this.colours.ballColour,
          })
          this.blue = this.svg.snapRoot.path(
              `M ${-16.8 * this.svg.scale} ${-8.5 * this.svg.scale}` +
              `C ${-14 * this.svg.scale} ${-10 * this.svg.scale} ${-8.8 * this.svg.scale} 0 ${-8.8 * this.svg.scale} 0` +
              `C ${5.2 * this.svg.scale} ${-3.2 * this.svg.scale} ${2.6 * this.svg.scale} ${-19 * this.svg.scale} ${14.2 * this.svg.scale} ${-13.6 * this.svg.scale}` +
              `C ${17.4 * this.svg.scale} ${-10.8 * this.svg.scale} ${17.4 * this.svg.scale} ${-10.8 * this.svg.scale} ${19.1 * this.svg.scale} ${-6.5 * this.svg.scale}` +
              `C ${12 * this.svg.scale} ${-15.1 * this.svg.scale} ${14.8 * this.svg.scale} ${4.2 * this.svg.scale} ${-2.8 * this.svg.scale} ${5.2 * this.svg.scale}` +
              `C ${-3.8 * this.svg.scale} ${14.5 * this.svg.scale} ${5.5 * this.svg.scale} ${18.5 * this.svg.scale} ${8.5 * this.svg.scale} ${18.5 * this.svg.scale}` +
              `C ${3.5 * this.svg.scale} ${20.9 * this.svg.scale} ${3.5 * this.svg.scale} ${20.9 * this.svg.scale} ${-0.4 * this.svg.scale} ${19.9 * this.svg.scale}` +
              `C ${-9.9 * this.svg.scale} ${17.8 * this.svg.scale} ${-9.7 * this.svg.scale} ${12.3 * this.svg.scale} ${-8.5 * this.svg.scale} ${7.8 * this.svg.scale}` +
              `C ${-12.4 * this.svg.scale} ${3.3 * this.svg.scale} ${-14.8 * this.svg.scale} ${1.1 * this.svg.scale} ${-19 * this.svg.scale} ${1 * this.svg.scale}` +
              `C ${-19 * this.svg.scale} ${-3.6 * this.svg.scale} ${-19 * this.svg.scale} ${-3.6 * this.svg.scale} ${-16.8 * this.svg.scale} ${-8.5 * this.svg.scale}`
          )
          this.blue.attr({
              stroke: this.colours.ballOutlineColour,
              strokeWidth: 1 * this.svg.scale,
              fill: this.colours.ballOutlineColour,
          })
          this.courtObject = this.svg.snapRoot.group(this.circle, this.blue)

          this.courtObject.attr({ cursor: 'move' })
          this.courtObject.drag(move, start, stop);

          this.drawn = true
      }
      return CourtObject.prototype.draw.call(this, time)
  }
}

// CoverageArea
class CoverageArea extends CourtObject {
    constructor(areaConfig, courtConfig, svgConfig) {
        super(areaConfig, courtConfig, svgConfig);
        this.width = areaConfig.width;
        this.height = areaConfig.height;
        this.colour = areaConfig.colour || 'rgba(0, 255, 0, 0.3)'; // Default: semi-transparent green
        this.drawn = false; // Add this line
    }

     draw(time) {
        if (!this.drawn) {
            this.rect = this.svg.snapRoot.rect(0, 0, this.width * this.svg.scale, this.height * this.svg.scale);
            this.rect.attr({
                fill: this.colour,
                //stroke: 'black', // Optional border
                //strokeWidth: 1
            });
            this.courtObject = this.svg.snapRoot.group(this.rect);
            this.drawn = true;
        }
        return super.draw(time); // Call the base class draw method for positioning
    }

    // You can add a setArea method if you want to change the area after creation
    setArea(x, y, width, height, colour) {
        this.setPosition(x,y);
        this.width = width;
        this.height = height;
        this.colour = colour || this.colour; // Keep original color if not provided.
        this.movePending = true;
    }
}