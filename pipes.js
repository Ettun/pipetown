$(document).ready(function () { init() });
// Keep the cursor from changing during screen interactions.
document.onselectstart = function () { return false; }
// Credit to Simon Sarris for the starting code!
//
// Constructor for Shape objects to hold data for all drawn objects.
// For now they will just be defined as angles.
function Shape(form, locktype, x, y, w, h, fill, locked, direction, cause, component, z, group, pipe, level, mobile, destination) {
  // This is a very simple and unsafe constructor. All we're doing is checking if the values exist.
  // "x || 0" just means "if there is a value for x, use that. Otherwise use 0."
  // But we aren't checking anything else! We could put "Lalala" for the value of x 
  this.form = form || "rect";
  this.locktype = locktype || 'ghost'; // The types of lockpoints this shape will match with.
  this.x = x || 0;
  this.y = y || 0;
  this.w = w || 1;
  this.h = h || 1;
  this.originalx = x || 0;
  this.originaly = y || 0;
  this.locked = locked || 'start';
  this.fill = fill || '#AAAAAA';
  // Used to save the previous fill and instigate flash effects.
  this.oldfill = fill || '#AAAAAA';
  this.flash = 1;
  
  // These variables save information about the movement of shapes.
  this.mobile = mobile || false;
  this.edged = false;
  this.destination = new Array();
  this.destination['x'] = 0;
  this.destination['y'] = 0;
  this.midpoints = new Array();
  this.origin = new Array();
  this.origin['x'] = 0;
  this.origin['y'] = 0;
  
  this.direction = direction || 'north'; // The direction that the shape causes effects.
  this.cause = cause || 'none'; // The way this shape influences surrounding shapes, determined by direction.
  this.component = component || false; // Determines if the shape is part of the menu
  this.z = z || 0; // z-axis value of the shape on the grid, not the canvas.
  this.group = group || 0; // the unique ID number of the shape.
  
  this.pipe = pipe || false; // The pipe information string.
  this.level = level || 0; // The fluid level.
  this.finalLevel = level; // The destination for moving fluid.
  
  if (this.locktype == 'coolant') { // The pressure in the pipe.
	this.pressure = .03; 
  } else {
  	this.pressure = 0; 
  }
  this.powered = false; // Is the hull section connected to the pipe system?
  
  if (mobile) {
		this.destination['x'] = x;
  		this.destination['y'] = destination;
  }
  
  this.selected = false; // This item was previously selected.
}

function Lock(locktype, x, y, w, h, fill, gridx, gridy, baynumber, cause, z) {
  this.locktype = locktype || 0;
  this.x = x || 0;
  this.y = y || 0;
  this.w = w || 1;
  this.h = h || 1;
  this.fill = fill || '#AAAAAA';
  this.locked = false;
  // Grid position of the lock (different from its x and y position relative to the canvas).
  this.gridx = gridx || 0;
  this.gridy = gridy || 0;
  this.baynumber = baynumber || 0;
  // Used to track a lock's relationship to another lock.
  this.parents = [];
  this.pathparent = [];
  // Measures a lock's connection to other "connected" locks.
  this.connected = false;
  this.set = false;
  this.group = new Array();
  // Pathfinding variables.
  this.fvalue = 10000;
  this.gvalue = 0;
  this.hvalue = 0;
  this.closed = false;
  // Used to determine the condition of any ship parts in the lock
  this.cause = cause || 'none';
  this.effect = [];
  this.z = z || 0; // z-axis value of the lock on the grid, not the canvas.
  this.stack = []; // vertical stacking values for the lock.
  this.marked = false;
  this.emptystack = false;
  this.stackjoined = false;
  this.traced = false; // The lock was filled as part of a trace.
  this.orphaned = false; // Has the bottom lock been disconnected from its supporting structure?
  // Used to save the previous fill and instigate flash effects.
  this.oldfill = fill || '#AAAAAA';
  this.flash = 0;
  this.mode = 'build'; // Determine what gamemode the lock is in
  this.openings = []; // Array to hold openings for pipes.
}

function build_pipe(shape) {
	var new_line = shape.pipe.split(", ");
	var pipeworks = new Array();
	pipeworks['flow'] = new_line[0];
	pipeworks['fluid'] = new_line[1];
	var pl = new_line.length;
	pipeworks['openings'] = new Array();

	for (var pi = 1; pi < pl; pi++) {
		switch (new_line[pi]) {
			case 'up':
				pipeworks['openings'].push('up');
			break;
			case 'down':
				pipeworks['openings'].push('down');
			break;
			case 'left':
				pipeworks['openings'].push('left');
			break;
			case 'right':
				pipeworks['openings'].push('right');
			break;
		}
	}
	shape.pipe = pipeworks;
}

function collapse_pipe(shape) {
	var pipe_string = shape.pipe['flow'] + ", " + shape.pipe['fluid'];
	var plen = shape.pipe.openings.length;
	for (var i=0; i < plen; i++) {
		pipe_string += ", " + shape.pipe.openings[i];	
	}
	shape.pipe = pipe_string;
}


function shapesides(input, flip, test) { // noflip if we just want to return adjacency without flipping
	var flip = flip || false;
	var mySel = input;
	var shape = false;
	var lock = false;
	var passthrough = false;
	
	if (mySel.form == 'pipe') {
		shape = true;
		passthrough = true;	
	} else if (mySel.openings.length > 0) {
		lock = true;
		passthrough = true;
		flip = false;
	}
	
	if (passthrough) {
		
		var open_up = false;
		var open_down = false;
		var open_left = false;
		var open_right = false;
		
		if (shape) {
			build_pipe(mySel);
			var olen = mySel.pipe.openings.length;
			for (var iq=0; iq<olen; iq++) {
				switch (mySel.pipe.openings[iq]) {
					case 'left':
						if (flip) {
							open_left = true;
						} else {
							open_right = true;	
						}
					break;
					case 'right':
						if (flip) {
							open_right = true;
						} else {
							open_left = true;
						}
					break;
					case 'up':
						if (flip) {
							open_up = true;
						} else {
							open_down = true;
						}
					break;
					case 'down':
						if (flip) {
							open_down = true;
						} else {
							open_up = true;
						}
					break;
				}
			}
		} else {
			var olen = mySel.openings.length;
			for (var iq=0; iq<olen; iq++) {
				switch (mySel.openings[iq]) {
					case 'left':
						if (flip) {
							open_left = true;
						} else {
							open_right = true;	
						}
					break;
					case 'right':
						if (flip) {
							open_right = true;
						} else {
							open_left = true;
						}
					break;
					case 'up':
						if (flip) {
							open_up = true;
						} else {
							open_down = true;
						}
					break;
					case 'down':
						if (flip) {
							open_down = true;
						} else {
							open_up = true;
						}
					break;
				}
			}
		}
		
		if (open_right && open_left && open_up && open_down) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'cardinal';
			} else {
				mySel.pipe['openings'][0] = 'left';
				mySel.pipe['openings'][1] = 'right';
				mySel.pipe['openings'][2] = 'down';
				mySel.pipe['openings'][3] = 'up';
			}
		} else if (open_right && open_left && !open_up && !open_down) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'horizontal';
			} else {
				mySel.pipe['openings'][0] = 'up';
				mySel.pipe['openings'][1] = 'down';
			}
		} else if (open_up && open_down && !open_right && !open_left) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'vertical';
			} else {
				mySel.pipe['openings'][0] = 'left';
				mySel.pipe['openings'][1] = 'right';
			}
		} else if (open_up && open_down && open_right && !open_left) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'notwest';
			} else {
				mySel.pipe['openings'][0] = 'left';
				mySel.pipe['openings'][1] = 'right';
				mySel.pipe['openings'][2] = 'down';
			}
		} else if (open_up && open_down && open_left && !open_right) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'noteast';

			} else {
				mySel.pipe['openings'][0] = 'left';
				mySel.pipe['openings'][1] = 'right';
				mySel.pipe['openings'][2] = 'up';
			}
		} else if (open_up && open_right && open_left && !open_down) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'notsouth';
			} else {
				mySel.pipe['openings'][0] = 'up';
				mySel.pipe['openings'][1] = 'down';
				mySel.pipe['openings'][2] = 'right';
			}
		} else if (open_down && open_right && open_left && !open_up) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'notnorth';
			} else {
				mySel.pipe['openings'][0] = 'up';
				mySel.pipe['openings'][1] = 'left';
				mySel.pipe['openings'][2] = 'down';
			}
		} else if (open_left && open_up && !open_right && !open_down) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'upleft';
			} else {
				mySel.pipe['openings'][0] = 'up';
				mySel.pipe['openings'][1] = 'right';
			}
		} else if (open_right && open_up && !open_left && !open_down) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'upright';
			} else {
				mySel.pipe['openings'][0] = 'right';
				mySel.pipe['openings'][1] = 'down';
			}
		} else if (open_left && open_down && !open_right && !open_up) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'downleft';
			} else {
				mySel.pipe['openings'][0] = 'up';
				mySel.pipe['openings'][1] = 'left';
			}
		} else if (open_right && open_down && !open_left && !open_up) {
			if (!flip) {
				if (shape) {
					collapse_pipe(mySel);
				}
				return 'downright';
			} else {
				mySel.pipe['openings'][0] = 'left';
				mySel.pipe['openings'][1] = 'down';
			}
		}
		if (shape) {
			collapse_pipe(mySel);
		}
	}
}


// Draws this shape to a given context
Shape.prototype.draw = function(ctx) {
  ctx.fillStyle = this.fill;
  ctx.strokeStyle = this.fill;
  switch (this.form) {
	  case "rect":
	  	ctx.fillRect(this.x, this.y, this.w, this.h);
	  break;
	  case "pipe":
	  	build_pipe(this);
		var olen = this.pipe.openings.length;
		var open_up = false;
		var open_down = false;
		var open_left = false;
		var open_right = false;
		var bend_width = part_unit;
		var doublepad = 2 * padding;
		var fluidLevel = this.level * .1;
		
		for (var i=0; i<olen; i++) {
			switch (this.pipe.openings[i]) {
				case 'left':
					open_left = true;
				break;
				case 'right':
					open_right = true;
				break;
				case 'up':
					open_up = true;
				break;
				case 'down':
					open_down = true;
				break;
			}
		}
		
		function pipeFill(shape) {
			
			switch (shape.pipe.flow) {
				case "left":
					var fluidGradient = ctx.createLinearGradient(shape.x - edge_difference+shape.w + (2 * edge_difference), shape.y - edge_difference, shape.x - edge_difference, shape.y - edge_difference);
				break;
				case "right":
					var fluidGradient = ctx.createLinearGradient(shape.x - edge_difference,shape.y - edge_difference, shape.x - edge_difference+shape.w + (2 * edge_difference), shape.y - edge_difference);
				break;
				case "up":
					var fluidGradient = ctx.createLinearGradient(shape.x - edge_difference,shape.y - edge_difference+shape.h + (2 * edge_difference), shape.x - edge_difference, shape.y - edge_difference);
				break;
				case "down":
					var fluidGradient = ctx.createLinearGradient(shape.x - edge_difference, shape.y - edge_difference, shape.x - edge_difference, shape.y - edge_difference+shape.h + (2 * edge_difference));
				break;
			}
			
			if (shape.level == 0) {
				return shape.fill;
			} else if (shape.level > 9) {
				return shape.pipe.fluid;
			} else {
				fluidGradient.addColorStop(fluidLevel + .1,shape.fill);
				fluidGradient.addColorStop(fluidLevel,shape.pipe.fluid);
				return fluidGradient;
			}
		}
		
		if (open_up && open_down) { // Vertical pipe.
			this.direction = 'vertical';
			var left = this.x;
			var right = this.w;
			var top = this.y - edge_difference - doublepad;
			var bottom = this.h + (2 * edge_difference) + (3 * padding);
			var pipefluid = pipeFill(this);
			ctx.fillStyle = pipefluid;
			ctx.fillRect(left, top, right, bottom);
		}
		
		if (open_right && open_left) { // Horizontal pipe.
			this.direction = 'horizontal';
			var left = this.x - edge_difference - doublepad;
			var right = this.w + (2 * edge_difference) + (2 * doublepad);
			var top = this.y;
			var bottom = this.h;
			var pipefluid = pipeFill(this);
			ctx.fillStyle = pipefluid;
			ctx.fillRect(left, top, right, bottom);
		}
		
			if (open_up && open_down && open_right) { // Vertical pipe opening right.
				this.direction = 'notwest';
				ctx.strokeStyle = pipeFill(this);
				ctx.beginPath();
				ctx.moveTo(this.x + (.5 * this.w), this.y + .5 * this.h);
				ctx.lineTo(this.x + this.w + edge_difference + doublepad, this.y + (.5 * this.h));
				ctx.lineWidth = this.w;
				pipeFill(this);
				ctx.stroke();
			} else if (open_up && open_down && open_left) {	// Vertical pipe opening left.
				this.direction = 'noteast';
				ctx.strokeStyle = pipeFill(this);
				ctx.beginPath();
				ctx.moveTo(this.x - edge_difference - doublepad, this.y + .5 * this.h);
				ctx.lineTo(this.x + (.5 * this.w), this.y + .5 * this.h);
				ctx.lineWidth = this.w;
				pipeFill(this);
				ctx.stroke();	
			} else if (open_up && open_left && open_right) { // Horizontal pipe opening up.
				this.direction = 'notsouth';
				ctx.strokeStyle = pipeFill(this);
				ctx.beginPath();
				ctx.moveTo(this.x + (.5 * this.w), this.y + .5 * this.h);
				ctx.lineTo(this.x + (.5 * this.w), this.y - edge_difference - doublepad);
				ctx.lineWidth = this.w;
				pipeFill(this);
				ctx.stroke();
			} else if (open_down && open_left && open_right) { // Horizontal pipe opening down.
				this.direction = 'notnorth';
				ctx.strokeStyle = pipeFill(this);
				ctx.beginPath();
				ctx.moveTo(this.x + (.5 * this.w), this.y + .5 * this.h);
				ctx.lineTo(this.x + (.5 * this.w), this.y + this.h + edge_difference + doublepad);
				ctx.lineWidth = this.w;
				ctx.stroke();
				
				
			} else if (open_left && open_down) {
				this.direction = 'southwest';
				ctx.strokeStyle = pipeFill(this);
				ctx.beginPath();
				ctx.moveTo(this.x - edge_difference - doublepad, this.y + .5 * this.h);
				ctx.lineTo(this.x - closedge - doublepad, this.y + .5 * this.h);
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(this.x - closedge - doublepad, this.y + this.h + closedge + doublepad, (.5 * bend_width), 0, Math.PI*1.5, true ); 
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(this.x + .5 * bend_width - closedge - doublepad, this.y + this.h + edge_difference + padding);
				ctx.lineTo(this.x + .5 * bend_width - closedge - doublepad, this.y + this.h + closedge + padding);
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
			} else if (open_left && open_up) {
				this.direction = 'northwest';
				ctx.strokeStyle = pipeFill(this);
				ctx.beginPath();
				ctx.moveTo(this.x - edge_difference - doublepad, this.y + .5 * this.h);
				ctx.lineTo(this.x - closedge - doublepad, this.y + .5 * this.h);
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(this.x - closedge - doublepad, this.y - closedge - doublepad, (.5 * bend_width), Math.PI*.5, 0, true ); 
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(this.x + .5 * bend_width - closedge - doublepad, this.y - closedge);
				ctx.lineTo(this.x + .5 * bend_width - closedge - doublepad, this.y - edge_difference - doublepad);
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
			} else if (open_right && open_down) {
				this.direction = 'southeast';
				ctx.strokeStyle = pipeFill(this);
				ctx.beginPath();
				ctx.moveTo(this.x + bend_width - doublepad, this.y + .5 * this.h);
				ctx.lineTo(this.x + bend_width - closedge - doublepad, this.y + .5 * this.h);
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(this.x + bend_width - closedge - doublepad, this.y + this.h + closedge + doublepad, (.5 * bend_width), Math.PI*1, Math.PI*1.5, false ); 
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(this.x + .5 * bend_width - closedge - doublepad, this.y + this.h + edge_difference + 1);
				ctx.lineTo(this.x + .5 * bend_width - closedge - doublepad, this.y + this.h + closedge + 1);
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
			} else if (open_right && open_up) {
				this.direction = 'northeast';
				ctx.strokeStyle = pipeFill(this);
				ctx.beginPath();
				ctx.moveTo(this.x + bend_width - doublepad, this.y + .5 * this.h);
				ctx.lineTo(this.x + bend_width  - closedge - doublepad, this.y + .5 * this.h);
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(this.x + bend_width - closedge - doublepad, this.y - closedge - doublepad, (.5 * bend_width), Math.PI*.5, Math.PI*1, false ); 
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(this.x + .5 * bend_width - closedge - doublepad, this.y - closedge);
				ctx.lineTo(this.x + .5 * bend_width - closedge - doublepad, this.y - edge_difference - doublepad);
				ctx.lineWidth = bend_width * .5;
				ctx.stroke();
			}
			
			if (open_right && open_left && open_up && open_down) {
				this.direction = 'cardinal';	
			}
			
			collapse_pipe(this);
	  break;
	  case "triup":
		ctx.beginPath();
		ctx.moveTo(this.x, this.y+this.h);
	    ctx.lineTo(this.x+.5*this.w, this.y);
		ctx.lineTo(this.x+this.w, this.y+this.h);
		ctx.fill();
	  break;
	  case "tridown":
	  	ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(this.x+.5*this.w, this.y+this.h);
		ctx.lineTo(this.x+this.w, this.y);
		ctx.fill();
	  break;
	  case "triright":
	  	ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(this.x+this.w, this.y+.5*this.h);
		ctx.lineTo(this.x, this.y+this.h);
		ctx.fill();
	  break;
	  case "trileft":
	  	ctx.beginPath();
		ctx.moveTo(this.x+this.w, this.y);
		ctx.lineTo(this.x, this.y+.5*this.h);
		ctx.lineTo(this.x+this.w, this.y+this.h);
		ctx.fill();
	  break;
	  case "circ":
	  	ctx.beginPath();
		ctx.arc(this.x+(.5*this.w), this.y+(.5*this.w), .5*this.w, 0, Math.PI*2, true); 
		ctx.closePath();
		ctx.fill();
	  break;
	  default:
	  break;
  }
}

Lock.prototype.draw = function(ctx) {
switch (this.mode) {
  	case 'travel':
	ctx.fillStyle = 'clear';
	break;
	case 'flow':
	ctx.fillStyle = this.fill;
	break;
	case 'build':
	ctx.fillStyle = this.fill;
	break;
  }
  ctx.fillRect(this.x, this.y, this.w, this.h);
}

Lock.prototype.unset = function() {
	this.locktype = 0;
	this.locked = false;
	this.parents = [];
	this.effect = [];
	this.group = [];
	this.fill = starting_fill;
}

Lock.prototype.empty = function(complete) {
	this.locktype = 'start';
	this.locked = false;
	this.parents = [];
	this.effect = [];
	this.group = [];
	if (complete == true) {
		this.stack = [];
	}
	this.fill = virgin_fill;
}


Number.prototype.acot =
	// Add arc cotangent to the Number function.
    function(){
      return Math.PI / 2 - Math.atan(this);
    };
	
Lock.prototype.contains = function(h, w, mx, my, mz, z) {
		var w_stamps = Math.ceil(iw/this.w);
		var w_spaces = (padding * (w_stamps-1));
		var h_stamps = Math.ceil(ih/this.h);
		var h_spaces = (padding * (h_stamps-1));
 		return  ((this.z == z) && (this.x <= mx) && (this.x + ((this.w * w_stamps) + w_spaces) >= mx) && (this.y <= my) && (this.y + ((this.h * h_stamps) + h_spaces) >= my))
		 }
		 
function contains(x, y, h, w, mx, my) {
	// The simplest form of contains, to determine if the mouse is in a specific defined rectangle.
 		return  (((x <= mx) && (x + w) >= mx) && ((y <= my) && (y + h) >= my))
		}

Shape.prototype.contains = function(mx, my, mz) {
  // Determine if a point is inside the shape's bounds
  // For a rectangle, all we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Height) and its Y and (Y + Height)
if (this.form != "pipe") {
	
 return  (
 		 (this.z == mz || this.z == 'all') &&
 		 (this.x <= mx) && (this.x + this.w >= mx) &&
         (this.y <= my) && (this.y + this.h >= my) && (this.form == "rect")) ||
	// 		Next are "contain" calculators for a triangle. This is a bit more tricky- this code compares the angle created between the lower corner of the drawn triangle and the mouse coordinates to the angle of the drawn isoceles triangle. Using inverse tangents function Math.atan (because we know the length of the opposing and adjacent lines), we compare the angles of the two triangles. As long as the mouse-made triangle's angle is more acute (less than or equal to) the container triangle, that mouse point is within the drawn triangle. Because the mouse could be on either side of the center of the drawn triangle, we use Math.abs and subtract from the center to ensure that whichever side is drawn on, the same angle is found.
			 (this.form == "triup") && (this.z == mz || this.z == 'all') && ((this.x <= mx) && (this.x + this.w >= mx) && (this.y <= my) && (this.y + this.h >= my)
			 && (
				Math.atan(
					Math.abs(
					(my - (this.y + this.h))
					) 
					/
					((.5*this.w) -
					(Math.abs(
						mx-((.5*this.w) + this.x))
					)
					)			
				)
			 <=(Math.atan((this.h / (.5*this.w)))
			 ))
			)||
			// Triangles facing left.
					 (this.form == "trileft") && (this.z == mz || this.z == 'all') && ((this.x <= mx) && (this.x + this.w >= mx) && (this.y <= my) && (this.y + this.h >= my)
			 && (
				Math.atan(
					Math.abs(
					(mx - (this.x + this.h))
					) 
					/
					((.5*this.w) -
					(Math.abs(
						my-((.5*this.w) + this.y))
					)
					)			
				)
			 <=(Math.atan((this.h / (.5*this.w)))
			 ))
			)||
			// Triangles facing right.
					 (this.form == "triright") && (this.z == mz || this.z == 'all') && ((this.x <= mx) && (this.x + this.w >= mx) && (this.y <= my) && (this.y + this.h >= my)
			 && (
				Math.atan(
					Math.abs(
					(mx - this.x)
					) 
					/
					((.5*this.w) -
					(Math.abs(
						my-((.5*this.w) + this.y))
					)
					)			
				)
			 <=(Math.atan((this.h / (.5*this.w)))
			 ))
			)||
			// Circles! The first argument is "the square root of the distance of mouse x and mouse y from the center of the circle squared". If the the area of the mouse-created circle is smaller than the area of the object circle, then it's in the selection.
					 (this.form == "circ") && (this.z == mz || this.z == 'all') && ((this.x <= mx) && (this.x + this.w >= mx) && (this.y <= my) && (this.y + this.w >= my)
			 && (
			 Math.sqrt((Math.abs(mx-(this.x+.5*this.w))*Math.abs(mx-(this.x+.5*this.w))) + (Math.abs(my-(this.y+.5*this.w))*Math.abs(my-(this.y+.5*this.w)))) <= (.5*this.w))
			 ) ||
			// Same deal as upside triangles. The only difference is that the height of the mouse-created angle is calculated by subtracting the y point of the container alone, rather than the y point of the container added to the height of the container. 		 
			(this.form == "tridown") && (this.z == mz || this.z == 'all') && ((this.x <= mx) && (this.x + this.w >= mx) && (this.y <= my) && (this.y + this.h >= my)
			 && (
				Math.atan(
					Math.abs(
					(my - this.y)
					) 
					/
					((.5*this.w) -
					(Math.abs(
						mx-((.5*this.w) + this.x))
					)
					)			
				)
			 <=(Math.atan((this.h / (.5*this.w)))
			 ))
		); 
	} else {
		 return  (
			 (this.z == mz || this.z == 'all') &&
			 (this.x - edge_difference - padding <= mx) && (this.x - edge_difference - padding + this.w * 2 + closedge + padding >= mx) &&
			 (this.y - edge_difference - padding <= my) && (this.y - edge_difference - padding + this.h * 2 + closedge >= my) && (this.form == "pipe"))
	}
}

// Determine if a shape is inside a lock and matches its locktype
function inside (lock, shape, notype) {
	if (!notype) { // Set the notype variable to true if we don't care whether the shape matches the locktype.
		var ilocktype = shape.locktype;
	} else {
		var ilocktype = 0;	
	}
	var ix = shape.x;
	var iy = shape.y;
	var iw = shape.w;
	var ih = shape.h;
	var iz = shape.z || lock.z;
  switch(ilocktype) {
  case 'engine': case 'ai': case 'hull': case 'bodystart': case 0: case 'body':
  // Stamps and spaces are for shapes more than one block in size. It divides the width of any shape by the size of the lockpoint, and uses javascript's Math.Ceil function to determine the minimum number of locks necessary to contain the object, and uses that as the new maximum size. For shapes smaller than the lock, the function doesn't make any changes to the comparison, since Math.Ceil produces '1' and spaces results in '0'.
		var w_stamps = Math.ceil(iw/lock.w);
		var w_spaces = (padding * (w_stamps-1));
		var h_stamps = Math.ceil(ih/lock.h);
		var h_spaces = (padding * (h_stamps-1));
		var w_measure = (lock.w * w_stamps) + w_spaces;
		var h_measure = (lock.h * h_stamps) + h_spaces;
		var x_diff = Math.abs(lock.x - ix);
		var y_diff = Math.abs(lock.y - iy);
		var x_full_diff = Math.abs((lock.x + w_measure) - (ix + w_measure));
		var y_full_diff = Math.abs((lock.y + h_measure) - (iy + h_measure));
			return (
				(lock.z == iz) &&
				(lock.locktype == ilocktype || lock.locktype == 'body' || lock.locktype == 'bodystart') &&
				// The borders of the shape must lie within the borders of the lock.
				(lock.x + w_measure > ix + iw) &&
				((lock.x + lock.w) - w_measure <= ix) &&
				(lock.x < ix + iw) &&
				(lock.y + h_measure > iy + ih) &&
				((lock.y + lock.h) - h_measure <= iy) &&
				(lock.y < iy + ih) &&
						// The difference between the corners of the shape and the corners of the lock must be less than the total length or width of the lock.
						(
						(x_diff < w_measure) && (y_diff < h_measure) ||
						(x_diff < w_measure) && (y_full_diff < h_measure) ||
						(x_full_diff < w_measure) && (y_diff < h_measure) ||
						(x_full_diff < w_measure) && (y_full_diff < h_measure)
						)
					);
			  break;
  case 'cockpit': case 'tree':
	return  (lock.z == iz) && (lock.x < ix) && (lock.x + lock.w > ix+iw) &&
          (lock.y < iy) && (lock.y + lock.h > iy+ih) && 
		  (lock.locktype == ilocktype || lock.locktype == 'start');
  break;
  case 'human': case 'beast': case 'structure': case 'coolant':
  if (shape.form == 'pipe') {
			build_pipe(shape);
			var olen = shape.pipe.openings.length;
			var open_up = false;
			var open_down = false;
			var open_left = false;
			var open_right = false;
			for (var i=0; i<olen; i++) {
				switch (shape.pipe.openings[i]) {
					case 'left':
						open_left = true;
					break;
					case 'right':
						open_right = true;
					break;
					case 'up':
						open_up = true;
					break;
					case 'down':
						open_down = true;
					break;
				}
			}
			
			function pipe_fit (x, y, h, w, z, lock) {
				return  (
					(lock.locktype == ilocktype || ilocktype == 'coolant' && lock.locktype == 'bodystart' || ilocktype != 'coolant' && lock.locktype == 'body') &&
					(lock.x < x) && (lock.x + lock.w > x+w) &&
					(lock.y < y) && (lock.y + lock.h > y+h)
				);
			}
			
			collapse_pipe(shape);
			
			return pipe_fit(shape.x, shape.y, shape.h, shape.w, shape.z, lock);
		} else {
			return  (lock.z == iz) && (lock.x < ix) && (lock.x + lock.w > ix+iw) && (lock.y < iy) && (lock.y + lock.h > iy+ih);
		}
  break;
  }
}

 function collide(lock, ix, iy, iw, ih, iz) {
	 // This determines if a shape collides with a lock. Useful for determining multi-lock shapes and object collisions on the grid.
		var w_stamps = Math.ceil(iw/lock.w);
		var w_spaces = (padding * (w_stamps-1));
		var h_stamps = Math.ceil(ih/lock.h);
		var h_spaces = (padding * (h_stamps-1));
		var x_diff = Math.abs(lock.x - ix);
		var y_diff = Math.abs(lock.y - iy);
			return  (lock.z == iz) && (x_diff <= iw) && ((lock.x + lock.w) > ix)
			&& (y_diff <= ih) && ((lock.y + lock.h) > iy);
 }


  function connectcheck(loop, pipe) {
	  // This function relies on the 'adjacent' function to determine whether each lockpoint on the grid is connected to a 'start' lock or not. If true, the lockpoint is flagged as 'connected'.
	  var ll = loop.length;
	  for (var q=0;q<ll;q++){
			// Reset all connections to false.
			loop[q].connected = false;
			loop[q].set = false;
	  }
		
	  for (var q=0;q<ll;q++){
		  if (pipe) {
			  if (loop[q].cause == 'pump' && loop[q].locked == true) {
					loop[q].connected = true;
				}
		  } else {
				if (loop[q].locktype == 'start' && loop[q].locked == true) {
					loop[q].connected = true;
				}
				
				if (loop[q].locktype == 'bodystart' && loop[q].locked == true) {
					loop[q].connected = true;
				}
		  }
	   }
		
		function checkloop(loop, pipe) {
			var restart = false;
			var q = loop.length;
			while (q--) {
			// This determines whether a shape is connected to the origin 'start' shape by looping a 'connected' boolean for each shape adjacent to a "connected" shape, beginning with the 'start' shape. 
				check_loop:
				for (var qq=0, il=loop.length; qq<il; qq++) {
					if (loop[q].group == loop[qq].group && loop[q].group != 0 && loop[q].locked == true && loop[q].connected == true && loop[q].baynumber != loop[qq].baynumber && loop[q].locktype != 'bodystart') {
						if (loop[qq].connected != true) {
							loop[qq].connected = true;
							restart = true;
							break;
						}
					}
					
					if (loop[qq].locked == true) {
						if (pipe) {
							if (loop[q].locked == true && loop[q].openings.length > 0) {
								var direction = shapesides(loop[q]);
								if (adjacent(loop[q], loop[qq], direction) && loop[q].connected == true) {
									if (loop[qq].connected != true) {
										loop[qq].connected = true;
										restart = true;
									}
								}
							}
						} else {
							switch (loop[q].locktype){
								case 'body': case 0: //case 'bodystart':
									if (adjacent(loop[q], loop[qq], 'cardinal') && loop[q].connected == true) {
										if (loop[qq].connected != true) {
											loop[qq].connected = true;
											restart = true;
										}
									}
								break;
								case 'start':
									if (adjacent(loop[q], loop[qq], 'south')) {
										if (loop[qq].connected != true) {
											loop[qq].connected = true;
											restart = true;
										}
									}
								break;
							}
						}
					}
				}
			}
			if (restart == true) {
				return true;
			} else {
				return false;	
			}
		}
		
		var restart = true;
		while (restart == true) {
			restart = checkloop(loop, pipe);	
		}
  }
  
  	function pathfind(origin, target, lock, searchtime) {
		// Finds the nearest non-locked path from the origin to the target, then returns the position of the first lock on the route. Origin = starting lock, target = ending lock, lock= lock group, searchtime = maximum number of locks to search, direct = boolean for whether the path will go through or around locked shapes, shape = the shape loop.
		var ll = lock.length;
		var openlist = new Array();
		var target_found = false;
		var counter = 0;
		var timeout = false;
		var result = 'no path';
		var first_target = 0;
		var override = false;
		
		function fvalue(lock) {
			var xdiff = target.x-lock.x;
			var ydiff = target.y-lock.y;
			lock.hvalue = Math.abs(xdiff) + Math.abs(ydiff);
			lock.fvalue = lock.hvalue + lock.gvalue;
		}
		
		// Add the starting node to the open list.
		openlist.push(origin);
		var low_f = [];
		
		while (target_found == false) {
			var opl = openlist.length;
			var high_f = 10000;
			for (var q=0;q<opl;q++){
				if (openlist[q].closed == false) {
					// Assign f-values to each open node.
					fvalue(openlist[q]);
					// Look for the lowest F cost square on the open list.
					if (openlist[q].fvalue < high_f && (openlist[q].locked == false || openlist[q].locktype == 'bodystart')) {
						high_f = openlist[q].fvalue;	
						low_f = openlist[q];
					}
				}
			}
			
			// Switch the closest square to the closed list.
			low_f.closed = true;
			first_target++;
			if (low_f.baynumber == target.baynumber) {
				target_found = true;
			}
			
			for (var q=0;q<ll;q++){
				var cancel = false;
				var gvalue = 0;
				var found = false;
				var subject = 0;
				var open_left = false;
				var open_right = false;
				var open_up = false;
				var open_down = false;
				var mySel = false;
				var direction = 'cardinal';
				
				// Add the open adjacent nodes.
				if (adjacent(low_f, lock[q], direction) && lock[q].locked == false && lock[q].closed == false) {
					gvalue = low_f.gvalue + 10;
					found = true;
					for (var qq=0;qq<opl;qq++){
						if (lock[q].baynumber == openlist[qq].baynumber) {
							cancel = true;
						}
					}
				}
				
				if (found == true) {
					if (cancel != true) {
						lock[q].gvalue = gvalue;
						fvalue(lock[q]);
						openlist.push(lock[q]);
						lock[q].pathparent = low_f;
					} else {
						if (lock[q].gvalue < gvalue) {
							lock[q].pathparent = low_f.pathparent;
							low_f.gvalue = gvalue;
							fvalue(low_f);
						}
					}
				}
			}
			counter++;
			if (counter > searchtime) {
				target_found = true;
				timeout = true;
			}
		} // While target is not found, closed.
		
		if (target_found == true && timeout == false) {
			var first_value = 10000;
			first_square:
			for (var qq=0;qq<opl;qq++){
				if (openlist[qq].baynumber != origin.baynumber && openlist[qq].closed == true && openlist[qq].fvalue < first_value) {
					first_value = openlist[qq].fvalue;
					result = openlist[qq];
				}
			}
		}
		
		if (override) {
			result = override;
		}
		
		for (var q=0;q<ll;q++){
			lock[q].pathparent = [];
			lock[q].closed = false;
			lock[q].fvalue = 10000;
			lock[q].gvalue = 0;
			lock[q].hvalue = 0;
			openlist.length = 0;
		}
		return result;
	}
	
function pressure_flux (mySel, coolant_tank, inflow) {
	build_pipe(mySel);
	var ol = mySel.pipe.openings.length;
	
	if (inflow) {
		mySel.pressure = coolant_tank.pressure;
		mySel.finalLevel = 10;	
	}
	
	if (mySel.fill == 'red') {
		mySel.pressure = coolant_tank.pressure * 2;
		mySel.finalLevel = 10;	
	}
	
	if (mySel.fill == 'green') {
		mySel.pressure = coolant_tank.pressure / 2;
		mySel.finalLevel = 10;	
	}
	
	collapse_pipe(mySel);
}

function pressure_check(myState) {
// Conditions for pressurized pipes.

	var myState = myState;
	var coolant_tank = 0;
	var mySel = 0;
	var coolant_found = false;

	var shapes = myState.shapes;
	var lock = myState.lockpoints;
	var l = shapes.length;
	var ll = myState.lockpoints.length;
	
	for (var i = 0; i < l; i++) {
		if (shapes[i].form == 'pipe' && shapes[i].x > sidebar && shapes[i].locked == true) {
			for (var q = 0; q < ll; q++) {
				if (collide(lock[q], shapes[i].x, shapes[i].y, shapes[i].w, shapes[i].h, lock[q].z)) {	
					build_pipe(shapes[i]);
					lock[q].openings = shapes[i].pipe.openings;
					collapse_pipe(shapes[i]);
				}
				if (shapes[i].locktype == 'coolant') {
					coolant_tank = shapes[i];
					coolant_found = true;
				}
			}
		}	
	}
	
	for (var i = 0; i < l; i++) {
		if (shapes[i].form == 'pipe' && shapes[i].locktype != 'coolant' && shapes[i].x > sidebar && shapes[i].locked == true) {
			var mainlock = [];
			var final = [];
			var direction = [];
			var secondlock = new Array();
			var nopath = false;
			secondlock.length = 0;
			mySel = shapes[i];
			if (!coolant_found) {
				pressure_flux(mySel, 0, false);
			} else {
				for (var q = 0; q < ll; q++) {
					if (collide(lock[q], mySel.x, mySel.y, mySel.w, mySel.h, lock[q].z)) {
							mainlock = lock[q];
							direction = shapesides(mySel, false);	
					}
				}
	
				
				for (var q = 0; q < ll; q++) {
					var redirection = 'cardinal';
					if (adjacent(mainlock, lock[q], direction) && lock[q].locked) {
						redirection = shapesides(lock[q]);
						if (adjacent(lock[q], mainlock, redirection)) {
							secondlock.push(lock[q]);
						}
					}
				}
				
				if (secondlock.length > 0) {
					for (var ss = 0; ss < secondlock.length; ss++) {
						for (var ii = 0; ii < l; ii++) {
								if (collide(secondlock[ss], shapes[ii].x, shapes[ii].y, shapes[ii].w, shapes[ii].h, secondlock[ss].z) && shapes[ii].form == 'pipe' && shapes[ii].x > sidebar && shapes[ii].level == 10 && mySel.level == 0 && mySel.finalLevel == mySel.level) {
									final = secondlock[ss];
									build_pipe(mySel);
									build_pipe(shapes[ii]);
									mySel.pipe.fluid = shapes[ii].pipe.fluid;
									if (adjacent(mainlock, final, 'north')) {
										mySel.pipe.flow = 'up';	
									}
									
									if (adjacent(mainlock, final, 'south')) {
										mySel.pipe.flow = 'down';	
									}
									
									if (adjacent(mainlock, final, 'west')) {
										mySel.pipe.flow = 'left';	
									}
									
									if (adjacent(mainlock, final, 'east')) {
										mySel.pipe.flow = 'right';	
									}
									collapse_pipe(mySel);
									collapse_pipe(shapes[ii]);
									pressure_flux(mySel, coolant_tank, true);
								}
						}
					}
				} else {
					nopath = true;	
				}
				if (nopath && mySel.level != 0 && mySel.level == mySel.finalLevel) {
					pressure_flux(mySel, coolant_tank, false);
					mySel.level = 0;
					mySel.finalLevel = 0;
				}
			}
		}
	}
	
	for (var q = 0; q < ll; q++) {
		lock[q].openings = [];
	}
	// end of pipe pressurization.	
}

// Determine if another shape is adjacent on the grid to the original shape. Both variables are arrays, exterior holds the coordinates of an external shape (gridx and gridy, distinct from the canvas xy coordinates), direction is the array of possible directions we're designating as "adjacent". You could add additional non-cardinal directions to this if you want to skip spaces between connected pieces.
function adjacent(lock, exterior, direction) {
	  // Here, we determine the various types of adjacent shapes we want to check. The number of directions you add to a spread array determines which grid coordinates will return true in the "adjacent" function.
	switch (direction) {
	case 'corner': 
	spread = new Array();
	spread[0] = "NE";
	spread[1] = "E";
	spread[2] = "N";
	break;
	case 'full':
  	spread = new Array();
	spread[0] = "NE";
	spread[1] = "E";
	spread[2] = "N";
	spread[3] = "NW";
	spread[4] = "W";
	spread[5] = "SW";
	spread[6] = "S";
	spread[7] = "SE";
	break;
	case 'cardinal':
  	spread = new Array();
	spread[0] = "E";
	spread[1] = "N";
	spread[2] = "W";
	spread[3] = "S";
	break;
	case 'diagonal':
  	spread = new Array();
	spread[0] = "NW";
	spread[1] = "NE";
	spread[2] = "SW";
	spread[3] = "SE";
	break;
	case 'north':
  	spread = new Array();
	spread[0] = "N";
	break;
	case 'south':
  	spread = new Array();
	spread[0] = "S";
	break;
	case 'west':
  	spread = new Array();
	spread[0] = "W";
	break;
	case 'east':
  	spread = new Array();
	spread[0] = "E";
	break;
	case 'exact':
  	spread = new Array();
	spread[0] = "X";
	break;
	case 'verticalnorth':
  	spread = new Array();
	spread[0] = "VN";
	break;
	case 'verticalsouth':
  	spread = new Array();
	spread[0] = "VS";
	break;
	case 'horizontalwest':
  	spread = new Array();
	spread[0] = "HW";
	break;
	case 'horizontaleast':
  	spread = new Array();
	spread[0] = "HE";
	break;
	case 'vertical':
  	spread = new Array();
	spread[0] = "N";
	spread[1] = "S";
	break;
	case 'horizontal':
  	spread = new Array();
	spread[0] = "W";
	spread[1] = "E";
	break;
	case 'upleft':
  	spread = new Array();
	spread[0] = "N";
	spread[1] = "W";
	break;
	case 'upright':
  	spread = new Array();
	spread[0] = "N";
	spread[1] = "E";
	break;
	case 'downleft':
  	spread = new Array();
	spread[0] = "S";
	spread[1] = "W";
	break;
	case 'downright':
  	spread = new Array();
	spread[0] = "S";
	spread[1] = "E";
	break;
	case 'notsouth':
  	spread = new Array();
	spread[0] = "E";
	spread[1] = "N";
	spread[2] = "W";
	break;
	case 'notnorth':
  	spread = new Array();
	spread[0] = "E";
	spread[1] = "W";
	spread[2] = "S";
	break;
	case 'noteast':
  	spread = new Array();
	spread[0] = "N";
	spread[1] = "W";
	spread[2] = "S";
	break;
	case 'notwest':
  	spread = new Array();
	spread[0] = "E";
	spread[1] = "N";
	spread[2] = "S";
	break;
	}
	
	// The actual calculations. You can combine one or multiple conditions in the spread array, and the function will check against all of them before returning true.
	var dl = spread.length;
		for (var i = dl-1; i >= 0; i--) {
			switch (spread[i]) {
				case 'N':
				var north = (lock.gridx == exterior.gridx && lock.gridy == exterior.gridy - 1 && lock.z == exterior.z);
				break;
				case 'NE':
				var northeast = (lock.gridx - 1 == exterior.gridx && lock.gridy == exterior.gridy - 1 && lock.z == exterior.z);
				break;
				case 'E':
				var east = (lock.gridx - 1 == exterior.gridx && lock.gridy == exterior.gridy && lock.z == exterior.z);
				break;
				case 'SE':
				var southeast = (lock.gridx - 1 == exterior.gridx && lock.gridy == exterior.gridy + 1 && lock.z == exterior.z);
				break;
				case 'S':
				var south = (lock.gridx == exterior.gridx && lock.gridy == exterior.gridy + 1 && lock.z == exterior.z);
				break;
				case 'SW':
				var southwest = (lock.gridx + 1 == exterior.gridx && lock.gridy == exterior.gridy + 1 && lock.z == exterior.z);
				break;
				case 'W':
				var west = (lock.gridx + 1 == exterior.gridx && lock.gridy == exterior.gridy && lock.z == exterior.z);
				break;
				case 'NW':
				var northwest = (lock.gridx + 1 == exterior.gridx && lock.gridy == exterior.gridy - 1 && lock.z == exterior.z);
				break;
				case 'X':
				var exact = (lock.gridx  == exterior.gridx && lock.gridy == exterior.gridy && lock.z == exterior.z);
				break;
				case 'H':
				var horizontal = (lock.gridy == exterior.gridy && lock.z == exterior.z);
				break;
				case 'V':
				var vertical = (lock.gridx == exterior.gridx && lock.z == exterior.z);
				break;
				case 'VS':
				var verticalsouth = (lock.gridy > exterior.gridy && lock.gridx == exterior.gridx && lock.z == exterior.z);
				break;
				case 'VN':
				var verticalnorth = (lock.gridy < exterior.gridy && lock.gridx == exterior.gridx && lock.z == exterior.z);
				break;
				case 'HW':
				var horizontalwest = (lock.gridy == exterior.gridy && lock.gridx < exterior.gridx && lock.z == exterior.z);
				break;
				case 'HE':
				var horizontaleast = (lock.gridy == exterior.gridy && lock.gridx > exterior.gridx && lock.z == exterior.z);
				break;
			}
		}
		return (north || northeast || east || southeast || south || southwest || west || northwest || exact || horizontal || vertical || horizontalwest || horizontaleast || verticalnorth || verticalsouth);
}

function CanvasState(canvas) {
  // **** First some setup! ****
  this.canvas = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.ctx = canvas.getContext('2d');
  // This complicates things a little but but fixes mouse co-ordinate problems
  // when there's a border or padding. See getMouse for more detail
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
    this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
    this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
    this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
  }
  // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
  // They will mess up mouse coordinates and this fixes that
  var html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  // **** Keep track of state! ****
  
  this.valid = false; // when set to false, the canvas will redraw everything
  this.shapes = [];  // the collection of things to be drawn
  this.lockpoints = []; // the collection of lockpoints for components to attach to  
  this.position = 1; // the position of the selection menu
  this.dragging = false; // Keep track of when we are dragging
  this.tracing = false; // Keep track of when we are tracing the path of the mouse.
  this.shake = 0; // Measures number of shakes an shape makes
  this.mobile = false; // Keep track of when objects are moving
  this.flash = false; // Keep track of when objects are flashing
  this.review = false; // Keep track of when we are moving the grid
  // the current selected object. In the future we could turn this into an array for multiple selection
  this.selection = null;
  this.dragoffx = 0; // See mousedown and mousemove events for explanation
  this.dragoffy = 0;
  this.group = 0; //Counter for grouped locks, i.e. those locked to the same shape.
  this.snapshot = new Array(); // container for 'undo' states.
  
  this.zshot = new Array(); // container for 'z-level' states.
  this.ztop = -1; // The maximum z-layer.
  this.zbottom = -1; // The minimum z-layer.
  
  this.snaptrack = 0;
  this.undolimit = 15; // Maximum number of snapshots saved.
  this.ctrl = false // Is the ctrl key pressed?
  this.shiftkey = false // Is the shift key pressed?
  this.mobileCursor = 0 // Is the cursor moving?
  this.leftkey = 0;
  this.leftkeydown = false;
  this.rightkey = 0;
  this.rightkeydown = false;
  this.upkey = 0;
  this.upkeydown = false;
  this.downkey = 0;
  this.downkeydown = false;
  
  this.input = false; // Have we received player input?
  this.inputTimer = 0; // The timer for new inputs, based on cursorspeed and timed by the draw.
  
  this.zlevel = -1; // The current z-level of the canvas.
  this.wheelMove = false; // Is the mousewheel moving? 
  
  this.mode = 'build'; // The viewing mode, or current gametype.
  this.difficulty = 1; // The difficulty level.
  this.conveyor = false; // Is the conveyor belt moving?
  
  // Stores the last traced object, to change it depending on the new direction traced.
  this.prevTrace = [];
  this.prevLock = [];
  
 // Settings for pop-up prompts.
 prompt_up = true;
 victory = false;
 start = true;
 start2 = false;
 start3 = false;
 // These settings determine the size and dimensions of the building bay, where we construct objects.
 bayx_coefficient = .20;
 bayy_coefficient = .05;
 baywidth_coefficient = 1;
 bayheight_coefficient = .8;
 bayunit = 40; // The size of grid squares.
 part_unit = 30; // The size of ship parts.
 pipe_unit = Math.ceil(part_unit * .52); // The size of pipes.
 edge_difference = bayunit - part_unit;
 closedge = .5 * edge_difference;
 baynumber = 1; // The starting number for identifying grid squares.
 padding = 1;
 sidebar = this.width * .15; // The size of the menu bar on the left.
 
 buildbox = new Array;
 	buildbox.x=this.width - (5 * bayunit);
	buildbox.y=this.height - (.5 * sidebar) - (.9 * bayunit);
	buildbox.w=bayunit * 5; 
	buildbox.h=.58 * bayunit;
	buildbox.fill = 'red';
	buildbox.text = "Reset";
	
modebox = new Array();
	modebox.x=this.width - (5 * bayunit);
	modebox.y=this.height - (.5 * sidebar) - (-.1 * bayunit);
	modebox.w=bayunit * 5; 
	modebox.h=.58 * bayunit;
	modebox.fill = 'green';
	modebox.text = "Full Pressure";
	
pressurebox = new Array();
	pressurebox.x = 150;
	pressurebox.y = this.height - 85;
	pressurebox.w = 125;
	pressurebox.h = 50;
	pressurebox.fillStyle = 'white';
	pressurebox.lineWidth = 1;
	pressurebox.strokeStyle = 'black';
	pressurebox.text = 'PRESSURE';
	
levelbox = new Array();
	levelbox.x = 450;
	levelbox.y = this.height - 85;
	levelbox.w = 50;
	levelbox.h = 50;
	levelbox.fillStyle = 'white';
	levelbox.lineWidth = 1;
	levelbox.strokeStyle = 'black';
	levelbox.text = this.difficulty;

pressuregage = new Array();
	pressuregage.x = pressurebox.x + 175;
	pressuregage.y = pressurebox.y + 25;
	pressuregage.r = 30;
	pressuregage.fillStyle = 'white';
	pressuregage.lineWidth = 1;
	pressuregage.strokeStyle = 'black';
	pressuregage.pressure = 270;
	pressuregage.finalPressure = 270;
	
 
 // Background image settings
 bg = new Image;
 bg.src = "http://www.dodwelldesign.com/scp/img/crackedearth.jpg";
 bg.w = 192;
 bg.h = 192;
 bgtop = 0; // the top of the background image
 
 sidebg = new Image;
 sidebg.src = "http://www.dodwelldesign.com/scp/img/conveyor.png";
 sidebg.w = sidebar;
 sidebg.h = this.height * 1.5;
 
 botbg = new Image;
 botbg.src = "http://www.dodwelldesign.com/scp/img/panel.png";
 botbg.w = this.w + 50;
 botbg.h = sidebar;
 
 min_drag = 48; // the minimum dragging distance.
 // Check if the canvas should be redrawing.
 if (this.mode == 'travel') {
	this.valid = false; 
 }
 
 menu_center = (sidebar * .5) - (part_unit * .4); // The center of the sidebar
 component_space = sidebar + bayunit; // Distance between components.
 
 // Settings for the behavior of locks and shapes.
 ready_fill = '#888';
 starting_fill = '#BBB';
 virgin_fill = '#CCC';
 flash_frequency = 75; // The length of a cycle for a flashing object. Minimum is 4.
 cursor_position_x = 1; // x position of the cursor
 cursor_position_y = 1; // y position of the cursor
 
 // Settings for mouse control.
 mousespeed = 1.2 // The speed of the mouse. 1 is the 'natural' speed.
 cursorspeed = 30 // Time, in milliseconds, between cursor shifts.
 inputspeed = 5 // How fast, in milliseconds, we accept user commands.
								 
  // **** Then events! ****
  
  // This is an example of a closure!
  // Right here "this" means the CanvasState. But we are making events on the Canvas itself,
  // and when the events are fired on the canvas the variable "this" is going to mean the canvas!
  // Since we still want to use this particular CanvasState in the events we have to save a reference to it.
  // This is our reference!
  var myState = this;
	
	
	function popup() { // Sets up the on-screen prompt.
		prompt_up = true;
		myState.valid = false;
	}
	
	function wipe() {
		// Reset all locks.
		var myLock = myState.lockpoints;
		var ll = myState.lockpoints.length;
		
		for (var q = 0; q < ll; q++) {
			if (myState.zlevel == 0) {
				myLock[q].empty(true);
			} else {
				myLock[q].unset();
			}
		}
	}
	
	function unset() { // For use when we want to clear locks, but not reset them to their start state.
		var myLock = myState.lockpoints;
		var ll = myState.lockpoints.length;
		for (var q = 0; q < ll; q++) {
			myLock[q].unset(); // Calls the 'unset' prototype function of lockpoints.
		}
		var l = myState.shapes.length;
		var myShape = myState.shapes;
		// Is the lock stacked no more than one z-level above or below another shape? If so, set it to 'bodystart' so other shapes can be placed.
		for (var q=0;q<ll;q++){
			if (stacked(myLock[q], myState.zlevel) && myState.zlevel != 0) {
				myLock[q].fill = ready_fill;
				myLock[q].locktype = 'bodystart';
				myLock[q].connected = true;
				myLock[q].locked = false;
			}
		}
	}
	
	
	function highlight(gridx, gridy) {
		// highlight a grid square.
		var ll = myState.lockpoints.length;
		var myLock = myState.lockpoints;
		for (var q=0;q<ll;q++){
			if (myLock[q].gridx == gridx && myLock[q].gridy == gridy) {
				if (myLock[q].flash == 0) {
					myLock[q].flash = 1;
					myState.flash = true;
				} else {
					if (myLock[q].fill == 'white') {
						myLock[q].fill = myLock[q].oldfill;	
					}
					myLock[q].flash = 0;
					myState.flash = false;
				}
			}
		}
	}
	
	function shape_glide(shape) {
		// slide a shape via player input
		var addx = myState.rightkey - myState.leftkey;
		var addy = myState.downkey - myState.upkey;
		var ll = myState.lockpoints.length;
		var myLock = myState.lockpoints;
		var newview = false;
		var overflow = false;
		var xshift = 0;
		var yshift = 0;
		var shiftlength_x = addx * (bayunit + padding);
		var shiftlength_y = addy * (bayunit + padding);
		var last_lock_x = 1;
		var last_lock_y = 1;
		
		function clearlock(lock){
			lock.fill = starting_fill;
			lock.locktype = 0;
			lock.effect = [];
			lock.parents = [];
		}
		
		for (q=0;q<ll;q++){
			if (myLock[q].gridx > last_lock_x) {
				last_lock_x = myLock[q].gridx;	
			}
			if (myLock[q].gridy > last_lock_y) {
				last_lock_y = myLock[q].gridy;	
			}
		}
		
		if (shape.mobile == false) {
			shape.edged = false;
			shape.origin['x'] = shape.x;
			shape.origin['y'] = shape.y;
		}
		
		for (q=0;q<ll;q++){
			if (myLock[q].gridx == 1 && shape.x + shiftlength_x < myLock[q].x || myLock[q].gridx == last_lock_x && shape.x + shape.w + shiftlength_x > myLock[q].x + myLock[q].w || myLock[q].gridy == 1 && shape.y + shiftlength_y < myLock[q].y || myLock[q].gridy == last_lock_y && shape.y + shape.h + shiftlength_y > myLock[q].y + myLock[q].h) {
				overflow = true;
			}
			if (collide(myLock[q],shape.origin['x'] + shiftlength_x, shape.origin['y'] + shiftlength_y, shape.w, shape.h, shape.z) && myLock[q].locked) {
				overflow = true;	
			}
		}	
		
		if (shape.x + shiftlength_x < sidebar || shape.x + shape.w + shiftlength_x > myState.width) {
			var xshift = shiftlength_x * 5;
			var newview = true;
		}
		if (shape.y + shiftlength_y + shape.h > myState.height - sidebar || shape.y + shiftlength_y < 0) {
			var yshift = shiftlength_y * 5;
			var newview = true;
		}
		
		if (overflow == true) {
			shape.edged = true;
			var newview = false;
		} else {
			for (q=0;q<ll;q++){
				if (inside(myLock[q], shape)==true && shape.mobile == false) {
					myLock[q].locked = false;	
					myLock[q].connected = false;
					clearlock(myLock[q]);
					stack_splice(myLock[q], this.zlevel);
				}
			}
		}
		
		if (shape.edged == false) {
			shape.mobile = true;
			shape.destination['x'] = shape.origin['x'] + shiftlength_x;
			shape.destination['y'] = shape.origin['y'] + shiftlength_y;
		}
		
		if (newview == true) {
			changeview(xshift, yshift);	
		}
		
		myState.input = true;
		myState.valid = false;
}

		function shape_follow(shape, target) {
		// have one shape follow another shape
		var distancex = target.x - shape.x;
		var distancey = target.y - shape.y;
		var ll = myState.lockpoints.length;
		var myLock = myState.lockpoints;
		var origin_lock = [];
		var target_lock = [];
		var overflow = false;
		var xshift = 0;
		var yshift = 0;
		var addx = 0;
		var addy = 0;
		var last_lock_x = 1;
		var last_lock_y = 1;
		var shiftlength_x = 0;
		var shiftlength_y = 0;
		var pathfound = false;
		
		if (Math.abs(distancex) < (bayunit+padding) && Math.abs(distancey) < (bayunit+padding)) {
			overflow = true;
		} else {
			if (distancex > 0) {
				var addx = 1;	
			} else if (distancex < 0) {
				var addx = -1;	
			}
			if (distancey > 0) {
				var addy = 1;	
			} else if (distancey < 0) {
				var addy = -1;	
			} 
		}
		
		function clearlock(lock){
			lock.fill = starting_fill;
			lock.locktype = 0;
			lock.effect = [];
			lock.parents = [];
		}
		
		for (q=0;q<ll;q++){
			if (myLock[q].gridx > last_lock_x) {
				last_lock_x = myLock[q].gridx;	
			}
			if (myLock[q].gridy > last_lock_y) {
				last_lock_y = myLock[q].gridy;	
			}
			if (collide(myLock[q], target.origin['x'], target.origin['y'], target.w, target.h, target.z)) {
				target_lock = myLock[q];	
			}
			if (collide(myLock[q], shape.origin['x'], shape.origin['y'], shape.w, shape.h, shape.z)) {
				origin_lock = myLock[q];
			}
		}
		
		if (shape.mobile == false) {
			shape.edged = false;
			shape.origin['x'] = shape.x;
			shape.origin['y'] = shape.y;
		}
		
		function obstacle() {
			shiftlength_x = addx * (bayunit + padding);
			shiftlength_y = addy * (bayunit + padding);
			for (q=0;q<ll;q++){
				// If it hits the edges.
				//if (myLock[q].gridx == 1 && shape.x + shiftlength_x < myLock[q].x || myLock[q].gridx == last_lock_x && shape.x + shape.w + shiftlength_x > myLock[q].x + myLock[q].w || myLock[q].gridy == 1 && shape.y + shiftlength_y < myLock[q].y || myLock[q].gridy == last_lock_y && shape.y + shape.h + shiftlength_y > myLock[q].y + myLock[q].h) {
				//	overflow = true;
				//}
				// If it hits another shape.
				if (collide(myLock[q],shape.origin['x'] + shiftlength_x, shape.origin['y'] + shiftlength_y, shape.w, shape.h, shape.z) && myLock[q].locked) {
					if (inside(myLock[q], target)) {
						target.fill = 'black';
					}
				return true;
				}
			}	
		}
		
		var overflow = obstacle();
		
		if (overflow == true) {
			for (q=0;q<ll;q++){
				if (collide(myLock[q],shape.origin['x'], shape.origin['y'], shape.w, shape.h, shape.z) && myLock[q].connected == false) {
					var first_square = pathfind(myLock[q], target_lock, myLock, 20, false);
					if (first_square != 'no path') {
						pathfound = true;
						first_square.locked = true;
						shiftlength_x = first_square.x - myLock[q].x;
						shiftlength_y = first_square.y - myLock[q].y;
					}
				} else {
					shape.edged = true;	
				}
			}
		}
		
		if (overflow == true) {
			shape.edged = true;
		} else {
			for (q=0;q<ll;q++){
				if (inside(myLock[q], shape)==true && shape.mobile == false) {
					myLock[q].locked = false;	
					myLock[q].connected = false;
					clearlock(myLock[q]);
					stack_splice(myLock[q], this.zlevel);
				}
			}
		}
		
		if (shape.edged == false || pathfound == true) {
			shape.mobile = true;
			origin_lock.locked = false;
			shape.destination['x'] = shape.origin['x'] + shiftlength_x;
			shape.destination['y'] = shape.origin['y'] + shiftlength_y;
		}
		
		myState.input = true;
		myState.valid = false;
}
	
function shape_move(shape) {
	// move a shape via player input
	var addx = myState.rightkey - myState.leftkey;
	var addy = myState.downkey - myState.upkey;
	var ll = myState.lockpoints.length;
	var myLock = myState.lockpoints;
	var oldLock = [];
	var onboard = false;
	var newview = false;
	var xshift = 0;
	var yshift = 0;
	var move_x = addx * (bayunit + padding);
	var move_y = addy * (bayunit + padding);
	
	if (Math.abs(addx) + Math.abs(addy) > 1) {
		myState.mobileCursor++;	
	}
	
	shape.x += move_x;
	shape.y += move_y;
	
	for (q=0;q<ll;q++){
		if (collide(myLock[q], shape.x - move_x, shape.y - move_y, shape.w, shape.h, shape.z)) {
			oldLock = myLock[q];
		}
		
		if (collide(myLock[q], shape.x, shape.y, shape.w, shape.h, shape.z)) {
			if (shape.x < sidebar || shape.x > myState.width) {
				var xshift = addx * (bayunit + padding);
			}
			if (shape.y + shape.h > myState.height - sidebar || shape.y < 0) {
				var yshift = addy * (bayunit + padding);
			}
			myLock[q].locked = true;
			oldLock.locked = false;
			var newview = true;
			var onboard = true;
		}
	}
	
	if (onboard == false || myState.input == true) {
		shape.x -= addx * (bayunit + padding);
		shape.y -= addy * (bayunit + padding);	
		var newview = false;
	}
	
	if (newview == true) {
		changeview(xshift, yshift);	
	}
	
	myState.input = true;
	myState.valid = false;
}
	
function cursor_move() {
	// highlight a moveable cursor
	var addx = myState.rightkey - myState.leftkey;
	var addy = myState.downkey - myState.upkey;
	
	if (Math.abs(addx) + Math.abs(addy) > 1) {
		myState.mobileCursor++;	
	}
	
	if (myState.mobileCursor < 4) {
	
		var ll = myState.lockpoints.length;
		var myLock = myState.lockpoints;
		var gridx = cursor_position_x;
		var gridy = cursor_position_y;
		var edge = 0;
		for (var q=0;q<ll;q++){
			if (myLock[q].gridx == gridx && myLock[q].gridy == gridy) {
				if (myLock[q].flash > 0) {
					if (myLock[q].fill == 'white') {
						myLock[q].fill = myLock[q].oldfill;	
					}
					myLock[q].flash = 0;
				}
			}
			if (myLock[q].gridx == (gridx + addx) && myLock[q].gridy == (gridy + addy)){
				edge++;
				myLock[q].flash = 1;
				cursor_position_x += addx;
				cursor_position_y += addy;
				myState.flash = true;
			}
		}
		
		if (edge == 0) {
			for (var q=0;q<ll;q++){
				if (myLock[q].gridx == gridx && myLock[q].gridy == gridy) {
				 myLock[q].flash = 1;
				 myState.flash = true;	
				}
			}
		}
	}
	myState.valid = false;
}

function pipe_reset(level) {
	victory = false;
	myState.conveyor = false;
	pressuregage.pressure = 270;
	pressuregage.finalPressure = 270;
	pressurebox.text = 'PRESSURE';
	pressurebox.fillStyle = 'white';
	switch (level) { // Set the density of shapes (1-10), and speed of the flow (1-10) depending on difficulty.
		case 1: 
			var density = 3;
			var flow = 3;
		break;
		case 2: 
			var density = 4;
			var flow = 6;
		break;	
		case 3: 
			var density = 5;
			var flow = 9;
		break;	
	}
	
	var l = myState.shapes.length;
	var mySel = myState.shapes;
	for (var q=0;q<l;q++){
		mySel[q].flash = 0;
		if (mySel[q].locktype == 'coolant') {
			mySel[q].pressure = flow / 100;	
		}
	}
	
	myState.selection = null;
	var populate = false;
	while (populate == false) {
		populate = scrambled_eggs(density);
	}
	populate.locked = true;
	populate.locktype = 'ending';
	
	var new_pipe = ("left, blue, up, down");

	myState.addShape(new Shape("pipe", "structure", menu_center, part_unit, pipe_unit, pipe_unit, 'black', 'true', 'none', 'none', true, -1, 0, new_pipe, 0, false));
	
	var new_pipe = ('left, blue, up, down, left');
		
	myState.addShape(new Shape("pipe", "structure", menu_center, part_unit + component_space, pipe_unit, pipe_unit, 'black', 'true', 'none', 'none', true, -1, 0, new_pipe, 0, false));
	
	var new_pipe = ('left, blue, right, left');
		
	myState.addShape(new Shape("pipe", "structure", menu_center, part_unit + component_space*2, pipe_unit, pipe_unit, 'black', 'true', 'none', 'none', true, -1, 0, new_pipe, 0, false));
	
	var new_pipe = ('left, blue, down, right');
		
	myState.addShape(new Shape("pipe", "structure", menu_center, part_unit + component_space*3, pipe_unit, pipe_unit, 'black', 'true', 'none', 'none', true, -1, 0, new_pipe, 0, false));
	
	var new_pipe = ('left, blue, up, down, left, right');
	
	myState.addShape(new Shape("pipe", "coolant", menu_center, part_unit + component_space*4, pipe_unit, pipe_unit, 'black', 'true', 'verticalnorth', 'pump', true, -1, 0, new_pipe, 10, false));
	
	myState.valid = false;	
}

function scrambled_eggs(density) {
	myState.shapes.length = 0;
	var density = density / 10 || .3;
	
	var ll = myState.lockpoints.length;
	var myShape = myState.shapes;
	var myLock = myState.lockpoints;
	var beginning = false;
	var ending = false;
	var rng_highest = 0;
	var rng_lowest = 1;
	var startlock = null;
	
	for (var q=0;q<ll;q++){
		myLock[q].locked = false;
		myLock[q].locktype = 'start';
		myLock[q].flash = 0;
	}
	
	for (var q=0;q<ll;q++){
		var rng = Math.random();
		if (myLock[q].baynumber<= 15) {
			if (rng > rng_highest) {
				rng_highest = rng;
				beginning = myLock[q];	
			}
		} else if (myLock[q].baynumber >= 196 && myLock[q].baynumber <= 230) {
			if (rng < rng_lowest) {
				rng_lowest = rng;
				ending = myLock[q];	
			}
		}
	}
	
	for (var q=0;q<ll;q++){
		myLock[q].fill = starting_fill;
		myLock[q].locktype = 0;
	}
	
	ending.fill = 'red';
	ending.locktype = 'ending';
	beginning.fill = 'blue';
	beginning.locktype = 'bodystart';
	beginning.flash = 1;
	myState.flash = true;
	
	for (var q=0;q<ll;q++){
		var rng = Math.random();
		
		if (rng < density && (myLock[q].locktype != 'bodystart' && myLock[q].locktype != 'ending') && !adjacent(beginning, myLock[q], 'cardinal') && !adjacent(ending, myLock[q], 'cardinal')) {
			myState.addShape(new Shape("rect", "tree", myLock[q].x + 5, myLock[q].y + 5, part_unit, part_unit, '#DDD', 'true', 'none', 'none', false, myState.zlevel));
			myLock[q].locked = true;
			myLock[q].fill = ready_fill;
		}
	}
	
	var between = (pathfind(beginning, ending, myLock, 100, false, false));
	if (between == 'no path') {
		return false;
	} else {
		return ending;	
	}
}

function flipshape(mySel) {
	var flip = true;
	var mySel = mySel;

	shapesides(mySel, flip);
}
	
  // Now, the functions for various events.		
  // Listener for keyboard events.
  window.addEventListener('keydown', function(e) {
	 // Unused functions list: 
	 // highlight() = flashes a lock
	  switch (e.keyCode) {
		case 27: // escape key. 
		break;
		case 32: // spacebar.
		if ($('#canvas-display').hasClass('hidden') == false) {
			e.preventDefault();
		}
		if (myState.selection !== null) {
			if (myState.dragging == true && myState.selection.fill == 'purple') {
				flipshape(myState.selection);
			}
		}
		break;
		case 43: case 107: // + Key.
			//changeZ(1);
		break;
		case 45: case 109: // - Key.
			//changeZ(-1);
		break;
		case 113: // F2 Key.
		break;
		case 117: // F6 Key.
		break;
		case 118: // F7 Key.
		break;
		case 119: // F8 Key.
		break;
		case 37: // left arrow.
		break;
		case 38: // up arrow.
		break;
		case 39: // right arrow.
		break;
		case 40: // down arrow.
		break;
		case 120: // F9 Key.
		break;
		case 90: // Z Key.
		break;
		case 89: // Y Key.
		break;
		case 17 || 224: // CTRL key.
			myState.ctrl = true;
		break;
		case 16: // Shift key.
		break;
		case 37:
		break;
		case 192: // Tilde Key. ~ `
		break;
	  }
  }, false)
  
    window.addEventListener('keyup', function(e) {
	// Listener for key release events.
	  switch (e.keyCode) {
		case 17: // CTRL key.
		myState.ctrl = false;
		break;
		case 37: // left arrow.
		break;
		case 38: // up arrow.
		break;
		case 39: // right arrow.
		break;
		case 40: // down arrow.
		break;
	  }
  }, false)
  
  // fixes a problem where double clicking causes text to get selected on the canvas
  canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);
  // Up, down, and move are for dragging
  canvas.addEventListener('mousedown', function(e) {
	  switch (e.button) { // Handler for the mouse button specified.
		case 0: // Left click.
			if (myState.selection) {
				myState.selection.fill = myState.selection.oldfill;
			}
			var mouse = myState.getMouse(e);
			var mx = mouse.x;
			var my = mouse.y;
			var mz = myState.zlevel;
			var shapes = myState.shapes;
			var lockpoints = myState.lockpoints;
			var position = myState.position;
			this.shake = 0;
			var l = shapes.length;
				if (
				// All click directions for boxes, notifications, and non-gamepiece clickables go here.
				!contains(promptbox.x, promptbox.y, promptbox.h, promptbox.w, mx, my, mz, mz) && 
				!contains(modebox.x, modebox.y, modebox.h, modebox.w, mx, my, mz, mz) &&
				!contains(buildbox.x, buildbox.y, buildbox.h, buildbox.w, mx, my, mz, mz) && 
				prompt_up == false
				) {
					//prompt_up = false;
					myState.valid = false;
					for (var i = l-1; i >= 0; i--) {
					  if (shapes[i].contains(mx, my, mz) && (mz == shapes[i].z || shapes[i].z == 'all')) {
						var oldSel = shapes[i]; // A copy of the original shape clicked in the menu bar.
						if (shapes[i].locktype != "nav" && shapes[i].locktype != 'ghost' && shapes[i].component == true) {
							// Keep track of where in the object we clicked
							// so we can move it smoothly (see mousemove)
							if (myState.mobile != true) {
								myState.addShape(new Shape(oldSel.form, oldSel.locktype, oldSel.x, oldSel.y, oldSel.w, oldSel.h, oldSel.fill, 'false', oldSel.direction, oldSel.cause, false, mz, oldSel.group, oldSel.pipe, oldSel.level));
							}
							var mySel = shapes[0];
							myState.dragoffx = mx - mySel.x;
							myState.dragoffy = my - mySel.y;
							myState.dragging = true;
							myState.object = true;
							myState.selection = mySel;
							myState.valid = false;
							var ll = lockpoints.length;
								for (var q = ll-1; q >= 0; q--) {
									if (inside(lockpoints[q], mySel)) {
										// If the selection hasn't moved from its original position, bump it off canvas.
										if (mySel.x == oldSel.x && mySel.y == oldSel.y) {
											mySel.x = -4900;
										}
									myState.dragging = false;
									mySel.locked = true;
										 return;
									}
								}
							return;
							} else if (shapes[i].form == 'pipe') {
								myState.tracing = true;
						}
					  }
					}
					// havent returned means we have failed to select anything.
					// If there was an object selected, we deselect it
					myState.dragoffx = mx;
					myState.dragoffy = my;
					if (mx > sidebar && mx < myState.width && my > 0 && my < myState.height-sidebar &&
					   ( (baywidth > myState.width) || (bayheight + bayunit > myState.height - sidebar) )
					){
						myState.review = true;
						myState.object = false;
					}
					if (myState.selection) { //Selection has been clicked off. Memetic marker: Jungle.
					  var ll = lockpoints.length;
					  var mySel = myState.selection;
					  var select_start = 'no path';
					  var select_end = 'no path';
					  var shiftlength_x = 0;
					  var shiftlength_y = 0;
					  myState.selection = null;
					  myState.valid = false; // Need to clear the old selection border
					}
				} else {
					if (contains(buildbox.x, buildbox.y, buildbox.h, buildbox.w, mx, my, mz, mz)){
						buildbox.fill = 'white';
						prompt_up = false;
						pipe_reset(myState.difficulty);
						myState.valid = false;
					}
					if (contains(modebox.x, modebox.y, modebox.h, modebox.w, mx, my, mz, mz)){
						modebox.fill = 'white';
						var l = myState.shapes.length;
						for (var i = 0; i < l; i++) {
							if (myState.shapes[i].locktype == 'structure' || myState.shapes[i].locktype == 'coolant') {
								myState.shapes[i].pressure = 1;
							}
						}
					}
					
					if (contains(promptbox.x, promptbox.y, promptbox.h, promptbox.w, mx, my, mz, mz)){
						if (contains(confirmbox.x, confirmbox.y, confirmbox.h, confirmbox.w, mx, my, mz)){
							if (start || start2 || start3) {
								start = false;
								start2 = false;
								start3 = false;
							} else {
								pipe_reset(myState.difficulty);
							}
							prompt_up = false;
							myState.valid = false;
						}
						if (contains(denybox.x, denybox.y, denybox.h, denybox.w, mx, my, mz) && !start3 && !(myState.difficulty == 1 && !victory && !start && !start2)){
							if (start) {
								start = false;
								start2 = true;
							} else if (start2) {
								start2 = false;
								start3 = true;
							} else {
								start3 = false;
							
								if (myState.difficulty != 1 && !victory) {
									myState.difficulty -= 1;	
								} else if (myState.difficulty != 3 && victory){
									myState.difficulty += 1;		
								}
								start = false;
								pipe_reset(myState.difficulty);
								prompt_up = false;
								myState.valid = false;
							}
						}
					}
				}	
		   break;
	  }
	}, true);
  
  canvas.addEventListener('mousemove', function(e) {
    if (myState.dragging && myState.object && myState.selection !== null){
		if (myState.selection.x + myState.selection.w > myState.width || myState.selection.y+myState.selection.h > myState.height || myState.selection.x < 0 || myState.selection.y < 0) {
			myState.selection.x -= 4000;
			myState.selection = [];
			myState.valid = false;
		}
		var mouse = myState.getMouse(e);
		// We don't want to drag the object by its top-left corner, we want to drag it
		// from where we clicked. Thats why we saved the offset and use it here
	 	var drag_distance_x = mouse.x - myState.dragoffx;
		var drag_distance_y = mouse.y - myState.dragoffy; 
		if (drag_distance_x > min_drag || drag_distance_y > min_drag) {
			myState.selection.x = drag_distance_x;
			myState.selection.y = drag_distance_y;
		}
		myState.valid = false; // Something's dragging so we must redraw
	} else if (myState.review == true) {
		var mouse = myState.getMouse(e);
		change_x = mousespeed * (mouse.x - myState.dragoffx);
		change_y = mousespeed * (mouse.y - myState.dragoffy);
		changeview(-change_x, -change_y);
		myState.dragoffx = mouse.x;
		myState.dragoffy = mouse.y;
	} 
  }, true);
  
 	function Mouseleave(e) { 
		myState.review = false;
		myState.tracing = false;
		buildbox.fill = 'red';
		modebox.fill = 'green';
		var mouse = myState.getMouse(e);
		var cancel = false; // Measures if a placement is cancelled due to collision or other factors.
		var cancel_count = 0; // Measures the number of collisions before cancellation.
		var lock_count = 0; // Measures the number of locks a shape takes up, to ensure it doesn't take more than the minimum.
		var mx = mouse.x;
		var my = mouse.y;
		var mz = myState.zlevel;
		var shapes = myState.shapes;
		var myLock = myState.lockpoints;
		var l = shapes.length;
		var ll = myLock.length;
		var w_stamps = 0;
		var w_spaces = 0;
		var h_stamps = 0;
		var h_spaces = 0;
		var w_measure = 0;
		var h_measure = 0;
		if (myState.selection !== null) {
			if (myState.selection.locktype == 'structure') {
				for (var q=0;q<ll;q++){	
					var preempt = true;
					var direction = shapesides(myState.selection, false);
					if (inside(myLock[q], myState.selection)==true && myLock[q].locked == false) {
						for (var qq = 0; qq < ll; qq++) {
							if (adjacent(myLock[q], myLock[qq], direction) && (myLock[qq].locktype == 'start' || myLock[qq].locktype == 'body')){
								preempt = false;
							}
							if (adjacent(myLock[q], myLock[qq], direction) && myLock[qq].locktype == 'ending'){
								victory = true;
							}
						}
						if (preempt == true) {
							cancel = true;	
						}
					}
				}
			}	
		}
		
		for (var i = l-1; i >= 0; i--) {
			if (shapes[i].contains(mx, my, mz)) {
				var mySel = shapes[i];
				if (mySel.locktype != "nav") {
					myState.object = true;
					myState.selection = mySel;
					var ll = myLock.length;
					for (var q = ll-1; q >= 0; q--) {
						// A shape has been selected, and it is inside a non-locked grid point.
						if (inside(myLock[q], mySel)==true && myLock[q].locked == false) {
							myState.group++;
							myState.snaptrack++;
							mySel.group = myState.group;
							//Position the shape in the center of the grid box.
							var w_stamps = Math.ceil(mySel.w/myLock[q].w);
							var w_spaces = (padding * (w_stamps-1));
							var h_stamps = Math.ceil(mySel.h/myLock[q].h);
							var h_spaces = (padding * (h_stamps-1));
							var w_measure = (myLock[q].w * w_stamps) + w_spaces;
							var h_measure = (myLock[q].h * h_stamps) + h_spaces;
							
							for (var qqq = ll-1; qqq >= 0; qqq--) {
								if (collide(myLock[qqq], mySel.x, mySel.y, mySel.w, mySel.h, mySel.z)==true) {
									// Make sure the shape takes up the minimum number of locks.
									lock_count++;
									if (lock_count > ((w_stamps) * (h_stamps))) {
										cancel = true;
									}
								}
							}
							
							// Prevents the shape from "sticking" to the sides.
							if (mySel.x == myLock[q].x) {
								mySel.x++;	
							}
							if (mySel.y == myLock[q].y) {
								mySel.y++;	
							}
							if (mySel.x + w_measure == myLock[q].x + w_measure) {
								mySel.x--;	
							}
							if (mySel.y + h_measure == myLock[q].y + h_measure) {
								mySel.y--;	
							}
							
							// Positions the shape in the center of the locks it has occupies.
							if (mySel.x < myLock[q].x) {
								mySel.x = myLock[q].x - (.75 * w_measure) + (.5 * mySel.w);
							}
							if (mySel.x > myLock[q].x) {
								mySel.x = myLock[q].x + (.5 * w_measure) - (.5 * mySel.w);
							}
							if (mySel.y < myLock[q].y) {
								mySel.y = myLock[q].y - (.75 * h_measure) + (.5 * mySel.h);
							}
							if (mySel.y > myLock[q].y) {
								mySel.y = myLock[q].y + (.5 * h_measure) - (.5 * mySel.h);
							}
							
							if (mySel.x < sidebar || mySel.y > myState.height - sidebar) {
								var cancel = true;
							}
							
							myLock[q].cause = mySel.cause;
							var ll = myLock.length;
						
							mySel.locked = true;
							myLock[q].locked = true;
							
							if (mySel.form == 'pipe') {
								pressure_check(myState);	
							}

							// This locks points under large shapes. If any of the lockpoints collide (determined by the collide function) with the shape, they become locked. If they're already locked to something other than the shape in question, the placement is cancelled.
							for (var qqq = ll-1; qqq >= 0; qqq--) {
								if (collide(myLock[qqq], mySel.x, mySel.y, mySel.w, mySel.h, mySel.z)==true) {
									if (myLock[qqq].locked == true) {
									cancel_count++;
									}
								if (cancel_count > 1) {
									var cancel = true;
								} 
							}
					} // End secondary lock loop.
					if (cancel != true) {
						for (var qqq = ll-1; qqq >= 0; qqq--) {
							if (collide(myLock[qqq], mySel.x, mySel.y, mySel.w, mySel.h, mySel.z)==true) {
								myLock[qqq].locked = true;
								myLock[qqq].fill = ready_fill;
								myLock[qqq].cause = mySel.cause;
								myLock[qqq].group = myState.group;
								for (var qq = ll-1; qq >= 0; qq--) {
									switch(mySel.locktype) {
										// Unlocks/locks nearby squares for new components depending on the type of component placed down.
										case 'cockpit':
												myLock[qqq].fill = ready_fill;
												myLock[qqq].locktype = 'start';
												myLock[q].cause = mySel.cause;
											if (myLock[qq].locked == false) {
												if (adjacent(myLock[qq], myLock[qqq], 'north')) {
													myLock[qq].fill = ready_fill;
													myLock[qq].locktype = 'body';
												} else if (adjacent(myLock[qq], myLock[qqq], mySel.direction)) {
													myLock[qq].locktype = 0;
												} else {
													myLock[qq].fill = starting_fill;
													myLock[qq].locktype = 0;
												}
											}
										break;
										case 'coolant':
												myLock[qqq].fill = ready_fill;
												myLock[qqq].locktype = 'start';
												myLock[q].cause = mySel.cause;
												myState.flash = false;
												myLock[q].flash = 0;
											if (myLock[qq].locked == false) {
												if (adjacent(myLock[qq], myLock[qqq], 'cardinal')) {
													myLock[qq].fill = ready_fill;
													myLock[qq].locktype = 'body';
												} else if (adjacent(myLock[qq], myLock[qqq], mySel.direction)) {
													myLock[qq].locktype = 0;
												} else {
													myLock[qq].fill = starting_fill;
													myLock[qq].locktype = 0;
												}
											}
										break;
										case 'structure':
												var preempt = true
												myLock[qqq].fill = ready_fill;
												myLock[qqq].locktype = 'body';
												myLock[q].cause = mySel.cause;
												var direction = shapesides(mySel, false);
												switch (direction) {
													case 'downright':
														direction = 'upleft';
													break;
													case 'downleft':
														direction = 'upright';
													break;
													case 'upleft':
														direction = 'downright';
													break;
													case 'upright':
														direction = 'downleft';
													break;
													case 'noteast':
														direction = 'notwest';
													break;
													case 'notwest':
														direction = 'noteast';
													break;
													case 'notnorth':
														direction = 'notsouth';
													break;
													case 'notsouth':
														direction = 'notnorth';
													break;
												}
												if (adjacent(myLock[qq], myLock[qqq], direction) && myLock[qq].locktype != 'ending' && myLock[qq].locked != true){
													myLock[qq].fill = ready_fill;
													myLock[qq].locktype = 'body';
												}
										break;
										case 'bodystart':
											if (stacked(myLock[q], myState.zlevel)) {
													myLock[q].locktype = 'bodystart';
												} else {
													myLock[q].locktype = 'body';
											}
												
												if (stacked(myLock[qqq], myState.zlevel)) {
													myLock[qqq].locktype = 'bodystart';
												} else {
													myLock[qqq].locktype = 'body';
											}
											
												myLock[qqq].fill = ready_fill;
												myLock[qqq].locktype = 'bodystart';
												myLock[q].cause = mySel.cause;
											if (myLock[qq].locked == false) {
												if (adjacent(myLock[qq], myLock[qqq], 'cardinal')) {
													if (myLock[qq].locktype == 0){
														myLock[qq].fill = ready_fill;
														myLock[qq].locktype = 'body';
													}
												}
											} 
										break;
										case 'engine': case 'ai': case 'hull': case 'bodystart':		
											if (myLock[qq].locked == false) {
												if (adjacent(myLock[qq], myLock[qqq], 'cardinal')) {
													if (myLock[qq].locktype == 0){
														myLock[qq].fill = ready_fill;
														myLock[qq].locktype = 'body';
													}
												}
											} 
										break;
									} // End switch.
								} // End 3rd lock loop.
							} // End if... collide.
						} // End outer lock loop.
					} else { 
						mySel.locked = false;
						myLock[q].locked = false;
					} // End if... cancel.
					
					myState.valid = false;
						
					}  
					
					}  // End primary lock loop.
				} // End if... !nav.
			} // End if... contains.
		} // End outer shape loop.
		
		if (myState.selection !== null) {
			if (myState.selection.locked == true) {
				if (myState.selection.locktype == 'coolant' && myState.conveyor == false) { // Start the pipe conveyor belt.
					myState.conveyor = true;
					var l = myState.shapes.length;
					var myShape = myState.shapes;
					for (var i=0;i<l;i++){
						if (myShape[i].component == true) {
							myShape[i].mobile = true;
							myShape[i].destination['y'] = myState.height + part_unit;
							myShape[i].destination['x'] = myShape[i].x;
						}
					}	
				}
				myState.dragging = false;
			} else {
				var cancel = true;
			}
		}
		
		if (cancel == true) {
			myState.shake = 0;
			if (myState.selection.x != myState.selection.originalx){
				myState.mobile = true;
			} else {
				myState.dragging = false;
				//  Moves the non-locked shape outside the canvas. -5000
				if (myState.selection.locked == 'false'){
					if ((myState.selection.originalx == myState.selection.x) && (myState.selection.originaly == myState.selection.y)) {
					 	for (var i = l-1; i >= 0; i--) {
							if (myState.selection.x == shapes[i].x && myState.selection.originaly == shapes[i].y && myState.selection.x < sidebar) {
								myState.selection.x = -5000;
								myState.selection = shapes[i];
								if (shapes[i].selected && shapes[i].form == 'pipe') {
									flipshape(shapes[i]);	
								}
								shapes[i].selected = true;
							} else {
								shapes[i].selected = false;	
							}
						}
					} else {
						myState.selection.x = -5000;
					}
				}
				myState.valid = false;
			}
		}	
	}

    canvas.addEventListener('mouseup', function(e) {
		Mouseleave(e);
    }, true);

    canvas.addEventListener('mouseout', function(e) {
		Mouseleave(e);
    }, true);
  
  // **** Options! ****
  
  this.selectionColor = '#CC0000';
  this.selectionJoin = 'round';
  this.selectionWidth = 2;  
  this.interval = 10;
  setInterval(function() { myState.draw(); }, myState.interval);
}

CanvasState.prototype.addShape = function(shape) {
  this.shapes.unshift(shape);
  this.valid = false;
}

CanvasState.prototype.addLock = function(lock) {
  this.lockpoints.push(lock);
  this.valid = false;
}

CanvasState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function() {
	
	if (this.input == true) {
		this.inputTimer++;
		if (this.inputTimer == inputspeed){
			this.input = false;
			this.inputTimer = 0;
		}
	}
	
	if (this.flash == true) {
		var myLock = this.lockpoints;
		var ll = myLock.length;
		for (var q=0;q<ll;q++) {
			if (myLock[q].flash > 0) {
				if (myLock[q].fill != 'white') {
					myLock[q].oldfill = myLock[q].fill;
				}
				myLock[q].fill = 'white';
				myLock[q].flash++;
				this.valid = false;
			}
			if (myLock[q].flash > (flash_frequency/2)) {
				myLock[q].fill = myLock[q].oldfill;
				this.valid = false;
			}
			if (myLock[q].flash > flash_frequency) {
				myLock[q].flash = 1;
			}
		}
	}
	
// Shakes an selected object tagged as "mobile".
  if (this.mobile==true) {
	  this.selection.x = -5000;
	  this.selection = null;
	  this.mobile = false;
  }

  // if our state is invalid, redraw and validate!
  if (!this.valid) {
    var ctx = this.ctx;
    var shapes = this.shapes;
	var lockpoints = this.lockpoints;
    this.clear();

    // ** Add stuff you want drawn in the background all the time here **
	
	// draw all grid locks. Also determines the starting view of the grid. Since these go under the shapes, they are drawn first.
	var ll = lockpoints.length;
	for (var i = 0; i < ll; i++) {
		var lock = lockpoints[i];
		lock.mode = this.mode;
		if (lock.x > sidebar - bayunit && lock.y < this.height - (sidebar - .5 * bayunit) && lock.x > 0 && lock.y < this.width) {
		lock.draw(ctx, this);
		}
    }
	
	// draw shapes on the board.
    var l = shapes.length;
    for (var i = 0; i < l; i++) {
      var shape = shapes[i];
      // We can skip the drawing of elements that have moved off the screen. We remove off-screen shapes from the array to prevent clutter.
	  if (shape.x < -9999) {
		  shapes.splice (i, 1);
	  }
	  // Conditions where we don't draw the shape. If the shape is outside of the boundaries of the canvas or in the menu bars, it doesn't get drawn.
      if (shape.x > this.width || shape.y > this.height ||
          shape.x < 0 || shape.y + shape.h < 0 || (shapes[i].component == false && shapes[i].x + shapes[i].w < sidebar) || (shapes[i].component == false && shapes[i].y > this.height - sidebar)) 
		  continue;
		  if (shape.z == this.zlevel || shape.z == 'all') {
      			shapes[i].draw(ctx);
		  }
    }
    this.valid = true;

	// draw shapes on the sidebars
	var myLock = this.lockpoints;
	var ll = this.lockpoints.length;
	
	// Side bars.
	ctx.drawImage(botbg,10,this.height - sidebar);
	ctx.drawImage(sidebg,0,0);
	ctx.fillStyle = "rgba(255, 0, 0, 1)";
	ctx.font = "italic 14pt Courier";
	ctx.strokeStyle = "black";
	ctx.lineWidth = "1";
	// Travel mode box.

	ctx.fillStyle = modebox.fill;
	ctx.fillRect(modebox.x, modebox.y, modebox.w, modebox.h);
	var mode_label = ctx.strokeText(modebox.text, modebox.x + 5, modebox.y + (.45 * bayunit));
	// Build mode box
	
	ctx.fillStyle = buildbox.fill;
	ctx.fillRect(buildbox.x, buildbox.y, buildbox.w, buildbox.h);
	var build_label = ctx.strokeText(buildbox.text, buildbox.x + 5, buildbox.y  + (.45 * bayunit));
	
	ctx.beginPath();
		ctx.rect(pressurebox.x, pressurebox.y, pressurebox.w, pressurebox.h);
		ctx.fillStyle = pressurebox.fillStyle;
		ctx.fill();
		ctx.lineWidth = pressurebox.lineWidth;
		ctx.strokeStyle = pressurebox.strokeStyle;
		ctx.stroke();
		ctx.font = "16pt bold Lucida Console";
		ctx.textAlign = "center";
		ctx.fillStyle = "black";
		ctx.fillText(pressurebox.text, pressurebox.x + (.5 * pressurebox.w), pressurebox.y + (.8 * bayunit), pressurebox.w);
		
	ctx.beginPath();
		ctx.rect(levelbox.x, levelbox.y, levelbox.w, levelbox.h);
		ctx.fillStyle = levelbox.fillStyle;
		ctx.fill();
		ctx.lineWidth = levelbox.lineWidth;
		ctx.strokeStyle = levelbox.strokeStyle;
		ctx.stroke();
		ctx.font = "16pt bold Lucida Console";
		ctx.textAlign = "center";
		ctx.fillStyle = "black";
		ctx.fillText(this.difficulty, levelbox.x + (.5 * levelbox.w), levelbox.y + (.8 * bayunit), levelbox.w);
	
	// Draw the pressure gage and needle.
	ctx.beginPath();
		 ctx.arc(pressuregage.x, pressuregage.y, pressuregage.r, 0, 2*Math.PI, false);
		 ctx.fillStyle = pressuregage.fillStyle;
		 ctx.fill();
		 ctx.lineWidth = pressuregage.lineWidth;
		 ctx.stroke();
		 
		for (var a=0,aMax=(1.5*Math.PI),aStep=(Math.PI/30); a<aMax; a+=aStep){
			px1 = pressuregage.x+Math.sin(a)*pressuregage.r;
			py1 = pressuregage.y+Math.cos(a)*pressuregage.r;
			px2 = pressuregage.x+Math.sin(a)*(pressuregage.r-5);
			py2 = pressuregage.y+Math.cos(a)*(pressuregage.r-5);
			ctx.beginPath();
			ctx.moveTo(px1, py1);
			ctx.lineTo(px2, py2);
			ctx.stroke();
			//draw line between (px1,py1) and (px2,py2)
		};
	
	// The needle itself.
	ctx.beginPath();
	  var radians = pressuregage.pressure * (Math.PI/180);
	  ctx.strokeStyle = "red";
	  ctx.lineWidth = 3;
      ctx.moveTo(pressuregage.x, pressuregage.y);
	  px = pressuregage.x+Math.sin(radians)*pressuregage.r;	  
	  py = pressuregage.y+Math.cos(radians)*pressuregage.r;
      ctx.lineTo(px, py);
      ctx.stroke();
		 
	ctx.textAlign = "left";
	
	function shuffle(array) {
	  var currentIndex = array.length
		, temporaryValue
		, randomIndex
		;
	
	  // While there remain elements to shuffle...
	  while (0 !== currentIndex) {
	
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
	
		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	  }
	
	  return array;
	}
	
	if (!deathbreak) {
		var deathbreak = false;
	}
    for (var i = 0; i < l; i++) {
      var shape = shapes[i];
	  // Conditions where we don't draw the shape. If the shape is outside of the boundaries of the canvas or in the menu bars, it doesn't get drawn.
      if (shape.component == true) 
		  if (shape.z == this.zlevel || shape.z == 'all') {
      			shapes[i].draw(ctx);
		  }
		  
	  // Draw gage movement.
	  if (pressuregage.pressure != pressuregage.finalPressure) {
	  	if (pressuregage.pressure > pressuregage.finalPressure) {
			pressuregage.pressure -= .02;
		} else {
			pressuregage.pressure += .02;
		}
	  }
	  
	  if (shape.form == 'pipe' && shape.level != shape.finalLevel) { // If there is a pipe that's not fully pressurized, move gage.
		  if (shape.pressure < 1) {
		  	pressuregage.finalPressure = 270 - (shape.pressure * 2700);
		  } else {
			pressuregage.finalPressure = 0;
		  }
		  if (pressuregage.pressure < 180) {
			pressurebox.text = "WARNING";
			pressurebox.fillStyle = 'yellow';
		  } else {
			 pressurebox.text = "PRESSURE";
			pressurebox.fillStyle = 'white'; 
		  }
		  deathbreak = true;
			if (shape.finalLevel != 0) {
				shape.level += shape.pressure;
			} else {
				if (shape.level - shape.pressure > 0) {
					shape.level -= shape.pressure;
				} else {
					shape.level = 0;
					shape.finalLevel = 0;
				}
			}
			if (shape.level >= 10) {
				shape.level = 10;
				shape.finalLevel = 10;	
			}
			
			if (shape.level == 10 && shape.finalLevel == 10 || shape.level == 0 && shape.finalLevel == 0) {
				pressure_check(this);	
			}
	  }
	  
	  if (deathbreak == true) { // If there are no partially pressurized pipes.
		var doublebreak = true;
		for (var q = 0; q < l; q++) {
		var checkshape = shapes[q];
			if (checkshape.form == 'pipe' && checkshape.level != checkshape.finalLevel) {
				doublebreak = false;
			}
		}
		if (doublebreak == true) {
			prompt_up = true;
			pressuregage.finalPressure = 0;
			if (victory) {
				pressurebox.text = "COMPLETE";
				pressurebox.fillStyle = 'green';
			} else {
				pressurebox.text = "FAILURE";
				pressurebox.fillStyle = 'red';
				confirmbox.text = 'Reset';
			}
		}
	  }
	  
	  // Draw moving shapes.
	  if (shape.mobile == true) {
		  if (shape.x > shape.destination['x']) {
			  shape.x --;
		  } else if (shape.x < shape.destination['x']) {
			  shape.x ++;
		  }
		  
		  if (shape.y > shape.destination['y']) {
			  shape.y --;
		  } else if (shape.y < shape.destination['y']) {
			  shape.y ++;
		  }
		  
		  if (shape.x == shape.destination['x'] && shape.y == shape.destination['y']) {
			
			shape.mobile = false;
			
			// Create new shapes on the conveyor belt.
			if (shape.form == 'pipe' || shape.form == 'coolant') {
				switch (this.difficulty) {
					case 1:
						var rarity = .8;
						var common = .1;
					break;
					case 2:
						var rarity = .9;
						var common = .2;
						shape.y ++;
					break;
					case 3:
						var rarity = .95;
						var common = .3;
						shape.y += 2;
					break;
				}
				var directions = ['left', 'right', 'down', 'up'];
				var open_rand = Math.random();
					if (open_rand <= rarity) {
						var openings = 2;	
					} else {
						var openings = 3;	
					}
				
				var fill = 'black';
				var fluid_rand = Math.random();
				if (fluid_rand >= rarity) {
					fill = 'green';
				} else if (fluid_rand <= common) {
					fill = 'red';
				}
				
				var flip_rand = Math.random();
				if (flip_rand >= rarity) {
					fill = 'purple';
				}
				
				shuffle(directions);
				var pipestring = directions[0];
				for (var i = 1; i < openings; i++) {
					pipestring += ', ' + directions[i];
				}
				var new_pipe = ("left, blue, " + pipestring);
				var babyshape = this.addShape(new Shape("pipe", "structure", menu_center, part_unit, pipe_unit, pipe_unit, fill, 'true', 'none', 'none', true, -1, 0, new_pipe, 0, true, this.height + bayunit));
			}
			for (var q = 0; q < ll; q++) {
				if (inside(myLock[q], shape)){
					if (shape.midpoints.length > 0) {
						shiftlength_x = shape.midpoints[0].x - myLock[q].x;
						shiftlength_y = shape.midpoints[0].y - myLock[q].y;
						shape.destination['x'] += shiftlength_x;
						shape.destination['y'] += shiftlength_y;
						shape.midpoints.shift();
						shape.mobile = true;
					} else {
						myLock[q].locked = true;
						shape.locked = true;
					}
				}
				// Reset all connections to false.
				myLock[q].connected = false;
			}
		  }
	  }
    }
	
	if (this.selection) {
		if (this.selection.mobile == false) {
			if (this.leftkeydown == false) {
				this.leftkey = 0;
			}
			if (this.rightkeydown == false) {
				this.rightkey = 0;
			}
			if (this.upkeydown == false) {
				this.upkey = 0;
			}
			if (this.downkeydown == false) {
				this.downkey = 0;
			}
		}
	}
	
    // draw selection
    // right now this is just a stroke along the edge of the selected Shape
    if (this.selection !== null) {
	  // Box select format.
    	var mySel = this.selection;
	 if (typeof mySel.draw == 'function') {
		mySel.draw(ctx)
	  }
		ctx.strokeStyle = this.selectionColor;
     	ctx.lineWidth = this.selectionWidth;
		if (mySel.form != 'pipe') {
			ctx.strokeRect(mySel.x,mySel.y,mySel.w,mySel.h);
		} else {
			ctx.lineWidth = 1;
			ctx.strokeRect(mySel.x - edge_difference - padding, mySel.y - edge_difference - padding, mySel.w * 2 + closedge + padding, mySel.h * 2 + closedge);	
		}
		
		if (mySel.locked == true) {
			if (mySel.flash > 0) {
				if (mySel.fill != 'white') {
					mySel.oldfill = mySel.fill;
				}
				mySel.fill = 'white';
				mySel.flash++;
			}
			if (mySel.flash > (flash_frequency/2)) {
				mySel.fill = mySel.oldfill;
			}
			if (mySel.flash > flash_frequency-1) {
				mySel.flash = 1;
			}
		}
	}
		this.valid = false;
    
    // ** Add stuff you want drawn on top all the time here **
	if (prompt_up == true) { // This is for graphical prompts that appear over the current screen.
		promptbox = new Array();
		promptbox.x=.5 * this.width - 250;
		promptbox.y=110;
		promptbox.w=.7 * this.width; 
		promptbox.h=.5 * this.height;
		
		ctx.beginPath();
		ctx.rect(promptbox.x, promptbox.y, promptbox.w, promptbox.h);
		ctx.fillStyle = 'white';
		ctx.fill();
		ctx.lineWidth = 5;
		ctx.strokeStyle = 'black';
		ctx.stroke();
		
		ctx.font = "16pt bold Courier ";
		ctx.textAlign = "center";
		ctx.fillStyle = "black";
		
		confirmbox = new Array();
		confirmbox.x=promptbox.x + 50;
		confirmbox.y=promptbox.y + .8 * promptbox.h;
		confirmbox.w=150; 
		confirmbox.h=30;
		
		denybox = new Array();
		denybox.x=promptbox.x + .6 * promptbox.w;
		denybox.y=promptbox.y + .8 * promptbox.h;
		denybox.w=150; 
		denybox.h=30;
		
		if (victory) {
			text1 = "You've completed the pipe! It's flowing";
			text2 = " safely through town. Next difficulty level?";
			denybox.text = 'Next Level';
		} else {
			text1 = "You didn't complete the pipe in time!";
			text2 = "Better grab the mop.";
			denybox.text = 'Prev Level';
		}
		
		if (start || start2) {
			denybox.text = 'Continue';
		}
		
		if (start || start2) {
			confirmbox.text = 'Skip';
		}
		if (!start && !start2 && !start3) {
			confirmbox.text = 'Reset';
		}

		if (this.difficulty == 3 && victory) {
			text2 =	"for good. You've saved the town!";
		}
		
		if (start) {
			text1 = "A huge storm has hit the town! You must reroute the"
			text2 = "floodwater using the pipe system from the dam (highlighted "
			text3 = "in blue) to the reservoir (highlighted in red)."
			text4 = " "
			text5 = " ";
		}
		
		if (start2) {
			text1 = "First, place the blue hub at the dam. Then, connect pipes"
			text2 = "to reroute the water. Green pipes decrease the pressure, red"
			text3 = "ones increase it. You can rotate purple pipes using the"
			text4 = "spacebar."
			text5 = " ";
		}
		
		if (start3) {
			text1 = "Each section of town is more difficult to save than the last,"
			text2 = "and the pressure increases each time. Good luck, and hurry!"
			text3 = ""
			text4 = ""
			text5 = "";
		}
		
		ctx.fillText(text1, promptbox.x + .5 * promptbox.w, promptbox.y + 130);
		ctx.fillText(text2, promptbox.x + .5 * promptbox.w, promptbox.y + 160);
		if (start || start2 || start3) {
			ctx.fillText(text3, promptbox.x + .5 * promptbox.w, promptbox.y + 190);
			ctx.fillText(text4, promptbox.x + .5 * promptbox.w, promptbox.y + 220);
			ctx.fillText(text5, promptbox.x + .5 * promptbox.w, promptbox.y + 250);
		}
	
		

		ctx.fillStyle = 'red';
		if (start3) {
			ctx.fillStyle = 'green';
			confirmbox.text = 'Begin';	
		}
		
		ctx.fillRect(confirmbox.x, confirmbox.y, confirmbox.w, confirmbox.h);
		ctx.font = "18pt bolder Courier Serif";
		ctx.fillStyle = "black";
		ctx.fillText(confirmbox.text, confirmbox.x + .5 * confirmbox.w, confirmbox.y + 23, confirmbox.w);
		
		ctx.fillStyle = 'green';
		if (!(this.difficulty == 1 && !victory && !start && !start2) && !(this.difficulty == 3 && victory) && !start3) {
			ctx.fillRect(denybox.x, denybox.y, denybox.w, denybox.h);
			ctx.fillStyle = 'black';
			ctx.fillText(denybox.text, denybox.x + .5 * denybox.w, denybox.y + 23, denybox.w);
		}
		ctx.textAlign = "left";
		
	} else {
		promptbox = [];
		confirmbox = [];
		denybox = [];
	}
  }
}

// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-cor this can be tricky, we have to worry about padding and borders
CanvasState.prototype.getMouse = function(e) {
  var element = this.canvas, offsetX = 0, offsetY = 0, mx, my;
  
  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;
  
  // We return a simple javascript object (a hash) with x and y defined
  return {x: mx, y: my};
}

// If you dont want to use <body onLoad='init()'>
// You could uncomment this init() reference and place the script reference inside the body tag
//init();

function init() {
 var s = new CanvasState(document.getElementById('canvas1'));
 function lay_grid() {
		 //Gridx and gridy gives coordinates based on grid units. Important for impacting nearby grid squares.
		 baystartx = s.width * bayx_coefficient;
		 baystarty = s.height * bayy_coefficient;
		 baywidth = s.width * baywidth_coefficient;
		 bayheight = s.height * bayheight_coefficient;
		 var gridx = 1;
		 var gridy = 1;
		 while (baystartx + 1.05 * bayunit <= baywidth) {
			 var gridy = 1;
			 s.addLock(new Lock("start", baystartx, baystarty, bayunit, bayunit, virgin_fill, gridx, gridy, baynumber++, 'none', -1));
				while (baystarty + 1.05 * bayunit <= bayheight) {
					gridy++;
					baystarty += bayunit + padding;
					s.addLock(new Lock("start", baystartx, baystarty, bayunit, bayunit, virgin_fill, gridx, gridy, baynumber++, 'none', -1));
				}
				gridx++;
			 baystarty = s.height *.05;
			 baystartx += bayunit + padding;
		 }
	}

	lay_grid();
	
 // Initial navigation shapes go here.

var new_pipe = ("left, blue, up, down");
	
s.addShape(new Shape("pipe", "structure", menu_center, part_unit, pipe_unit, pipe_unit, 'black', 'true', 'none', 'none', true, -1, 0, new_pipe, 0));

var new_pipe = ('left, blue, right, left');
	
s.addShape(new Shape("pipe", "structure", menu_center, part_unit + component_space, pipe_unit, pipe_unit, 'black', 'true', 'none', 'none', true, -1, 0, new_pipe, 0));

var new_pipe = ('left, blue, up, left');
	
s.addShape(new Shape("pipe", "structure", menu_center, part_unit + component_space*2, pipe_unit, pipe_unit, 'black', 'true', 'none', 'none', true, -1, 0, new_pipe, 0));

var new_pipe = ('left, blue, down, right');
	
s.addShape(new Shape("pipe", "structure", menu_center, part_unit + component_space*3, pipe_unit, pipe_unit, 'black', 'true', 'none', 'none', true, -1, 0, new_pipe, 0));

var new_pipe = ('left, blue, up, down, left, right');

s.addShape(new Shape("pipe", "coolant", menu_center, part_unit + component_space*4, pipe_unit, pipe_unit, 'black', 'true', 'verticalnorth', 'pump', true, -1, 0, new_pipe, 10));

function scrambled_eggs() {
	var l = s.shapes.length;
	var ll = s.lockpoints.length;
	var myShape = s.shapes;
	var myLock = s.lockpoints;
	var beginning = false;
	var ending = false;
	var rng_highest = 0;
	var rng_lowest = 1;
	var startlock = null;
	
	for (var i=0;i<l;i++){
		if (myShape[i].component == false) {
			myShape[i].x = -5000;
		}
	}
	
	for (var q=0;q<ll;q++){
		myLock[q].locked = false;
		myLock[q].locktype = 'start';	
	}
	
	for (var q=0;q<ll;q++){
		var rng = Math.random();
		if (myLock[q].baynumber<= 15) {
			if (rng > rng_highest) {
				rng_highest = rng;
				beginning = myLock[q];	
			}
		} else if (myLock[q].baynumber >= 196 && myLock[q].baynumber <= 230) {
			if (rng < rng_lowest) {
				rng_lowest = rng;
				ending = myLock[q];	
			}
		}
	}
	
	for (var q=0;q<ll;q++){
		myLock[q].fill = starting_fill;
		myLock[q].locktype = 0;
	}
	
	ending.fill = 'red';
	ending.locktype = 'ending';
	beginning.fill = 'blue';
	beginning.locktype = 'bodystart';
	
	for (var q=0;q<ll;q++){
		var rng = Math.random();
		
		if (rng < .3 && (myLock[q].locktype != 'bodystart' && myLock[q].locktype != 'ending') && !adjacent(beginning, myLock[q], 'cardinal') && !adjacent(ending, myLock[q], 'cardinal')) {
			s.addShape(new Shape("rect", "tree", myLock[q].x + 5, myLock[q].y + 5, part_unit, part_unit, '#DDD', 'true', 'none', 'none', false, s.zlevel));
			myLock[q].locked = true;
			myLock[q].fill = ready_fill;
		}
	}
	
	var between = (pathfind(beginning, ending, myLock, 100, false, false));
	if (between == 'no path') {
		return false;
	} else {
		var endresult = new Array(ending, beginning);
		return endresult;	
	}
}
		
	var populate = false;
	while (populate == false) {
		populate = scrambled_eggs();
	}
	populate[0].locked = true;
	populate[0].locktype = 'ending';
	populate[1].flash = 1;
	s.flash = true;
}