var framesPerSecond = 25;

// ## input handling ##
function KeyMaster() {
    this.reset = function () {
        // key tracking
        this.rightPressed = false;
        this.leftPressed = false;
        this.upPressed = false;
        this.downPressed = false;
        this.firePressed = false;
        this.boostPressed = false;
    }

    this.reset();
};

var keyMaster = new KeyMaster();

// handle key down
$('body').keydown(function (key) {

    var result = true;

    if (key.keyCode == '37' || key.keyCode == '65') { // 37 for left arrow
        keyMaster.leftPressed = true;
    }
    else if (key.keyCode == '39' || key.keyCode == '68') { // 39 for right arrow
        keyMaster.rightPressed = true;
    }

    if (key.keyCode == '38' || key.keyCode == '87') { // 38 up arrow
        keyMaster.upPressed = true;
    }

    if (key.keyCode == '32') {
        result = false;
    }

    if (key.keyCode == '40') {
        result = false;
    }

    if (key.keyCode == '17') {
        keyMaster.boostPressed = true;
    }

    if (key.keyCode == '32') { // 32 space bar
        keyMaster.firePressed = true;
    }

    return false;
});

// handle key up
$('body').keyup(function (key) {
    if (key.keyCode == '37' || key.keyCode == '65') { // 37 for left arrow
        keyMaster.leftPressed = false;
    }
    else if (key.keyCode == '39' || key.keyCode == '68') { // 39 for right arrow
        keyMaster.rightPressed = false;
    }

    if (key.keyCode == '38' || key.keyCode == '87') { // 38 up arrow
        keyMaster.upPressed = false;
    }

    if (key.keyCode == '17') {
        keyMaster.boostPressed = false;
    }

    if (key.keyCode == '32') { // 32 space bar
        keyMaster.firePressed = false;
    }
});


// ## world objects ##

// single point in the world
function Point(x, y) {
    this.x = x;
    this.y = y;
};

// background stars
function Star(x, y) {
    this.point = new Point(x, y);

    this.draw = function (world, engine) {
        transformed = world.transformPoint(this.point);
        engine.drawRect(transformed.x - 1, transformed.y - 1, 2, 2, "white");
    }
};

// explosion

function ExplosionParticle(x, y, color, vectorX, vectorY) {
    this.point = new Point(x, y);
    this.vectorX = vectorX;
    this.vectorY = vectorY;
    this.color = color;

    this.draw = function (world, engine) {
        world.ctx.fillStyle = this.color;
        var transformed = world.transformPoint(this.point);
        engine.drawRect(transformed.x - 1, transformed.y - 1, 2, 2, this.color);
    }

    this.update = function (world, time, timeFromLastFrame, frameMult) {
        this.point.x += this.vectorX * frameMult;
        this.point.y += this.vectorY * frameMult;
    }
};

function Explosion(x, y, color) {
    this.point = new Point(x, y);
    this.color = color;

    this.particles = new Array();
    this.startTime = new Date();

    var degrees = 0;
    while (degrees < 360) {
        degrees += 10;

        var radians = Math.PI * degrees / 180;

        var speed = Math.random() * 2;

        var xDir = Math.sin(radians) * speed;
        var yDir = Math.cos(radians) * speed;

        this.particles.push(new ExplosionParticle(this.point.x, this.point.y, this.color, xDir, yDir));
    }

    this.draw = function (world, engine) {
        this.particles.forEach(function (item) {
            item.draw(world, engine);
        });
    }

    this.update = function (world, time, timeFromLastFrame, frameMult) {
        this.particles.forEach(function (item) {
            item.update(world, time, timeFromLastFrame, frameMult);
        });

        if (time.getTime() - this.startTime.getTime() > 1000) {
            world.removeDynamicObject(this);
        }
    }
};

// missile
function Missle(x, y, rotation) {
    this.point = new Point(x, y);
    this.rotation = rotation;
    this.exploded = false;
    var thisMissile = this;

    var currentTime = new Date();
    this.startTime = currentTime.getTime();

    this.startVectorX = 0.0;
    this.startVectorY = 0.0;

    this.init = false;

    this.speedMult = 20;
    this.hitPrimary = false;
    this.shooter = null;

    // used to set the shooter of the missile.
    // When calling this it is a missile being fired from a game object, not the primary ship.
    this.firer = function (shooter) {
        this.shooter = shooter;
        this.hitPrimary = true;
        this.speedMult = 5;
    }

    this.draw = function (world, engine) {
        var color = "#C2CD23";
        if (this.hitPrimary)
            color = "red";
        transformed = world.transformPoint(this.point);
        engine.drawRect(transformed.x - 3, transformed.y - 3, 6, 6, color);

        if (Math.abs(this.point.x - world.currentX) > 1000 ||
            Math.abs(this.point.y - world.currentY) > 1000) {
            world.removeDynamicObject(thisMissile);
        }
    }

    this.update = function (world, time, timeFromLastFrame, frameMult) {

        if (!this.init) {

            if (!this.hitPrimary) { // don't get velocity if shot from bad guy
                // get current velocity of ship
                this.startVectorX = world.vectorX;
                this.startVectorY = world.vectorY;
            }
            this.init = true;
        }

        if (this.exploded) {
            world.removeDynamicObject(thisMissile);
        } else {

            radians = Math.PI * this.rotation / 180;

            xDir = Math.sin(radians);
            yDir = Math.cos(radians);

            var newX = this.point.x + (xDir * this.speedMult + this.startVectorX) * frameMult;
            var newY = this.point.y - (yDir * this.speedMult + this.startVectorY) * frameMult;

            this.point = new Point(newX, newY);

            if (time) {
                if (time.getTime() - this.startTime > 10000) {
                    world.removeDynamicObject(thisMissile);
                }
            }
        }
    }

    this.checkCollision = true;

    this.collision = function (other, world) {
        if (!this.hitPrimary) {
            if (other.collisionWithMissile) {
                other.collisionWithMissile(world);
                this.exploded = true;
            }
        }
    }

    this.collisionWithPrimary = function (world) {

        if (this.hitPrimary) {
            this.shooter.shotHitPrimary(world);
        }
    }
};

// rect, used for clearing dirty areas
function Rect(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}

// ## render engine ##

function RenderEngine(world) {
    this.world = world;
    this.ctx = world.ctx;
    this.spacer = 50;

    this.dirtyRects = new Array();

    this.newFrame = function () {
        this.topLeft = 50;
        this.topRight = 50;
        this.topCenter = 50;

        // cleanup dirty areas of screen        
        while (this.dirtyRects.length > 0) {
            var rect = this.dirtyRects.pop();
            var p = this.world.transformPoint(new Point(rect.x, rect.y));
            this.ctx.clearRect(rect.x - 2, rect.y - 2, rect.width + 4, rect.height + 4);
        }
    }

    this.drawImage = function (img, x, y, width, height, rotation) {

        if (Math.abs(x) < world.canvasWidth && Math.abs(y) < world.canvasHeight) {

            this.dirtyRects.push(new Rect(x, y, width, height));

            var trueX = x + width / 2;
            var trueY = y + height / 2;

            this.ctx.save();
            this.ctx.translate(trueX, trueY);
            this.ctx.rotate(rotation * Math.PI / 180);
            this.ctx.translate(-trueX, -trueY);
            this.ctx.drawImage(img, x, y, width, height);
            this.ctx.restore();
        }
    }

    this.drawRect = function (x, y, width, height, color) {

        if (Math.abs(x) < world.canvasWidth && Math.abs(y) < world.canvasHeight) {

            this.dirtyRects.push(new Rect(x, y, width, height));

            var trueX = x + width / 2;
            var trueY = y + height / 2;

            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, width, height);
        }
    }

    this.drawText = function (text, x, y, small, align) {
        this.ctx.fillStyle = "#9D8F7E";
        this.ctx.strokeStyle = '#9D8F7E';
        if (small == undefined || !small)
            this.ctx.font = "32pt Verdana";
        else
            this.ctx.font = "16pt Verdana";
        if (align == undefined)
            this.ctx.textAlign = "center";
        else
            this.ctx.textAlign = align;
        this.ctx.fillText(text, x, y);
    };

    this.drawStatusText = function (text) {

        var x = 0;
        var y = 0;

        x = this.spacer - this.world.middleX;
        y = this.topLeft - this.world.middleY;
        this.topLeft += this.spacer;

        this.drawText(text, x, y, false, "left");
    }

    this.drawStatusValue = function (text, value) {
        var x = 0;
        var y = 0;

        x = this.world.middleX / 2;
        y = this.topRight - this.world.middleY;
        this.topRight += this.spacer / 2;

        this.drawText(text, x, y, true, "left");
        this.drawText(value, x + 150, y, true, "left");
    }

    this.drawProgressValue = function (text, value) {

        if (value > 100)
            value = 100;

        this.ctx.fillStyle = "#9D8F7E";
        this.ctx.strokeStyle = '#9D8F7E';
        var x = 0;
        var y = 0;

        this.ctx.font = "16pt Verdana";
        x = this.world.middleX / 2;
        y = this.topRight - this.world.middleY;
        this.topRight += this.spacer / 2;

        this.ctx.fillText(text, x, y);

        x += 150;
        this.ctx.strokeRect(x, y - 15, 100, 15);

        if (value > 0)
            this.ctx.fillRect(x, y - 15, value, 15);
    }
};

// World is broken up into Tiles

function Tile(world) {

    this.neighbors = new Array();
    this.objects = new Array();

    this.draw = function (world, engine) {
    }

    this.update = function (world, time, timeFromLastFrame, frameMult) {
    }
}

// ## The game world ##

// store information about the world
function World(canvasId, w, h) {

    thisWorld = this;

    // setup canvas stuff
    this.canvasId = canvasId;
    this.canvasDom = document.getElementById(canvasId);
    this.ctx = this.canvasDom.getContext('2d');

    this.engine = new RenderEngine(this);

    // setup inital vars
    this.canvasHeight = h;
    this.canvasWidth = w;

    this.rotation = 10;
    this.middleY = this.canvasHeight / 2;
    this.middleX = this.canvasWidth / 2;

    // world locations
    this.worldHeight = 5000;
    this.worldWidth = 5000;
    this.currentY = 2500;
    this.currentX = 2500;
    this.starCount = 1500;

    this.vectorX = 0.0;
    this.vectorY = 0.0;

    this.lastVectorX = 0.0;
    this.lastVectorY = 0.0;

    this.speed = 0.0;
    this.flyingMode = 0; // not flying
    this.rotationSpeed = 0.0;

    // world objects
    this.worldBackgroundObjects = new Array();
    this.dynamicObjects = new Array();
    this.menuObject = new Array();

    this.lastShot = 0;

    this.reset = function () {
        this.dynamicObjects = new Array();
        this.rotation = 10;

        this.currentY = 2500;
        this.currentX = 2500;

        this.vectorX = 0.0;
        this.vectorY = 0.0;

        this.lastVectorX = 0.0;
        this.lastVectorY = 0.0;

        this.speed = 0.0;
        this.flyingMode = 0; // not flying
        this.rotationSpeed = 0.0;

        // time
        this.currentFrameTime = new Date();
        this.lastFrameTime = this.currentFrameTime;
        this.timeSinceLastFrame = 0.0;
    }

    // transform a point
    this.transformPoint = function (point) {
        result = new Point(point.x, point.y);
        result.x -= this.currentX;
        result.y -= this.currentY;
        return result;
    }

    // transform with world
    this.transformWorld = function () {

        // save the world
        this.ctx.save();

        // translate world so middle is at center of the screen
        this.ctx.translate(this.middleX, this.middleY);

        // draw grid lines (debug only)
        //this.ctx.fillStyle = "white";
        //this.ctx.fillRect(0, -200, 1, 400);
        //this.ctx.fillRect(-200, 0, 400, 1);
    }

    // reset the world
    this.resetWorld = function () {

        // we need to restore the default tranformation 
        // and rotation before we clear the screen.                
        this.ctx.restore();

        //this.ctx.fillStyle = "black";
        //this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        //this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    this.addBackgroundObject = function (item) {
        this.worldBackgroundObjects.push(item);
    };

    this.addDynamicObject = function (item) {
        this.dynamicObjects.push(item);
    };

    this.addMenuObject = function (item) {
        this.menuObject.push(item);
    };

    this.removeDynamicObject = function (item) {
        for (var i = 0; i < this.dynamicObjects.length; i++) {
            if (this.dynamicObjects[i] == item) {
                this.dynamicObjects.splice(i, 1);
            }
        }
    };

    // update objects
    this.update = function (paused, running) {

        // setup time
        this.lastFrameTime = this.currentFrameTime;
        this.currentFrameTime = new Date();
        this.timeSinceLastFrame = (this.currentFrameTime.getTime() - this.lastFrameTime.getTime()) / 1000;

        if (!paused) {
            // setup rotation
            radians = Math.PI * this.rotation / 180;

            xDir = Math.sin(radians);
            yDir = Math.cos(radians);

            this.lastVectorX = this.vectorX;
            this.lastVectorY = this.vectorY;

            this.vectorX = this.vectorX * 0.99;
            this.vectorY = this.vectorY * 0.99;

            this.vectorX += xDir * this.speed * .15;
            this.vectorY += yDir * this.speed * .15;

            this.currentX += this.vectorX;
            this.currentY -= this.vectorY;

            // don't go outside of world (should change to wrap around)
            if (this.currentX < 0) {
                this.currentX = 0;
                this.vectorX = 0;
            }
            if (this.currentX > this.worldWidth) {
                this.currentX = this.worldWidth;
                this.vectorX = 0;
            }
            if (this.currentY < 0) {
                this.currentY = 0;
                this.vectorY = 0;
            }
            if (this.currentY > this.worldHeight) {
                this.currentY = this.worldHeight;
                this.vectorY = 0;
            }
        }

        if (!paused)
            this.updateDynamicObjects(running);
    };

    // update dynamic objects (non primary objects that move)
    this.updateDynamicObjects = function (running) {

        var dobjects = this.dynamicObjects;
        var cp = new Point(thisWorld.currentX, thisWorld.currentY);

        var cft = this.currentFrameTime;
        var tslf = this.timeSinceLastFrame;
        var frameMult = framesPerSecond * tslf;

        for (var i = 0; i < this.dynamicObjects.length; i++) {

            var item = this.dynamicObjects[i];

            if (item.update) {
                item.lastPosition = item.point;
                item.update(thisWorld, cft, tslf, frameMult);
            }
        }

        for (var i = 0; i < this.dynamicObjects.length; i++) {

            var item = this.dynamicObjects[i];

            // this should use a bounding property! bounding circle
            if (item.point && item.collisionWithPrimary) {

                if (isClose(item.point, cp) && isWithinRadius(item.point, cp, 30)) {
                    item.collisionWithPrimary(thisWorld);
                }
            }

            if (item.checkCollision && running) {

                for (var subIndex = 0; subIndex < this.dynamicObjects.length; subIndex++) {

                    var other = this.dynamicObjects[subIndex];                    

                    if (item != other && item.point != undefined && other.point != undefined &&
                        item.lastPosition != undefined && other.lastPosition != undefined) {

                        var itemDistance = calculateDistance(item.lastPosition, item.point);
                        var otherDistance = calculateDistance(other.lastPosition, other.point);

                        if (isClose(item.point, other.point)) {

                            var collision = false;

                            if (itemDistance < 10 && otherDistance < 10) {
                                if (isWithinRadius(item.point, other.point, 20)) {
                                    collision = true;
                                }
                            } else {
                                // We need to d a lot of compares. For now we will standarize on 5 compares for now..
                                var compares = 5;

                                var itemVector = getVector(item.lastPosition, item.point, 5);
                                var otherVector = getVector(other.lastPosition, other.point, 5);

                                var itemTmp = new Point(item.lastPosition.x, item.lastPosition.y);
                                var otherTmp = new Point(other.lastPosition.x, other.lastPosition.y);

                                for (var iter = 1; iter < compares; iter++) {

                                    itemTmp.x += itemVector.x;
                                    itemTmp.y += itemVector.y;

                                    otherTmp.x += otherVector.x;
                                    otherTmp.y += otherVector.y;

                                    if (isWithinRadius(itemTmp, otherTmp, 20)) {
                                        collision = true;
                                        break; // no more
                                    }
                                }
                            }
                            if (collision) {
                                if (item.collision)
                                    item.collision(other, thisWorld);
                                if (other.collision)
                                    other.collision(item, thisWorld);
                            }
                        }
                    }
                }
            }
        }
    };

    // draw world
    this.draw = function (paused, running) {

        var engine = this.engine;

        this.worldBackgroundObjects.forEach(function (item) {
            item.draw(thisWorld, engine);
        });

        this.dynamicObjects.forEach(function (item) {
            item.draw(thisWorld, engine);
        });

        this.menuObject.forEach(function (item) {
            item.draw(thisWorld, engine);
        });

        if (running)
            this.drawPrimary();
    };

    this.getFlyingImage = function () {
        var flying = document.getElementById('spaceshipflyingstill');
        if (this.flyingMode == 1)
            flying = document.getElementById('spaceshipflying1');
        else if (this.flyingMode == 2)
            flying = document.getElementById('spaceshipflying2');
        else if (this.flyingMode == 3)
            flying = document.getElementById('spaceshipboosting1');
        else if (this.flyingMode == 4)
            flying = document.getElementById('spaceshipboosting2');
        return flying;
    };

    // draw primary object (space ship)
    this.drawPrimary = function () {

        this.engine.drawImage(this.getFlyingImage(), -25, -25, 50, 50, this.rotation);

    };

    // create stars
    for (i = 0; i < this.starCount; i++) {
        this.addBackgroundObject(new Star(Math.random() * this.worldWidth, Math.random() * this.worldHeight));
    }

    this.reset();
};

// ## Actual game ##

// create a new instance of the space game
function SpaceGame(canvasId, width, height) {

    // save current canvas. why am I doing this?
    c = document.getElementById(canvasId);
    this.ctx = c.getContext('2d');
    this.ctx.save();
    this.world = new World(canvasId, width, height);
    this.running = false;
    this.paused = false;
    this.gunVer = 1; // single shot    
    this.intervalMS = 1 / framesPerSecond;
    me = this; // for use in setInterval below.    

    this.start = function () {
        this.running = true;
    };

    this.stop = function () {
        this.running = false;
    }

    this.reset = function () {
        this.running = false;
        this.gunVer = 1;
        this.world.reset();
        keyMaster.reset();
    }

    this.pause = function () {
        this.paused = true;
    }

    this.unpause = function () {
        this.paused = false;
    }

    this.upgradeGun = function () {
        this.gunVer++;
        if (this.gunVer > 3)
            this.gunVer = 3;
    }

    setTimeout(function () {
        me.gameLoop();
    },
    this.intervalMS);

    var lastUpdateTime = new Date().getTime();

    this.gameLoop = function () {
        me.world.engine.newFrame();

        var start = new Date().getTime();

        if (me.running) {

            if (!me.paused)
                me.processKeys();

            if (me.world.rotation > 360)
                me.world.rotation = 0;
            if (me.world.rotation < 0)
                me.world.rotation = 360;

            lastUpdateTime = start;
        }

        if (Math.abs(start - lastUpdateTime) < 5000) {
            me.world.resetWorld();
            me.world.transformWorld();
            me.world.update(me.paused, me.running);
            me.world.draw(me.paused, me.running);
        }

        var end = new Date().getTime();
        var total = end - start;

        // only show perf info if query string param "perf" is set to true.
        var url = location.href;
        if (url.toString().indexOf("perf=true") > 0) {
            $("#percentDiv").show();
            $("#percentValue").html(parseInt(total / (me.intervalMS * 1000) * 100));
        }

        var nextTimeout = this.intervalMS - total;
        if (nextTimeout < 0)
            nextTimeout = 10;

        setTimeout(function () {
            me.gameLoop();
        },
        nextTimeout);
    }

    // process key presses
    this.processKeys = function () {

        this.keyMaster = keyMaster;

        var rotationDeg = 2.5;
        if (this.world.rotationSpeed > 8)
            rotationDeg = 10;
        else if (this.world.rotationSpeed > 5)
            rotationDeg = 7.5;
        else if (this.world.rotationSpeed > 2)
            rotationDeg = 5;

        if (keyMaster.leftPressed) {
            this.world.rotation -= rotationDeg;

            this.world.rotationSpeed++;
        }
        else if (keyMaster.rightPressed) {
            this.world.rotation += rotationDeg;

            this.world.rotationSpeed++;
        }
        else {
            this.world.rotationSpeed = 0;
        }

        if (keyMaster.boostPressed) {
            this.world.speed = 10;

            if (this.world.flyingMode == 3)
                this.world.flyingMode = 4;
            else
                this.world.flyingMode = 3;

            if (this.world.usingBoosters)
                this.world.usingBoosters(thisWorld);
        }
        else if (keyMaster.upPressed) {
            this.world.speed += 1;

            if (this.world.speed > 3)
                this.world.speed = 3;

            if (this.world.flyingMode == 1)
                this.world.flyingMode = 2;
            else
                this.world.flyingMode = 1;

            if (this.world.usingRockets)
                this.world.usingRockets(thisWorld);

        }
        else {
            this.world.flyingMode = 0; // not flying
            this.world.speed = 0;
        }

        if (keyMaster.firePressed) {

            var d = new Date().getTime();

            if (Math.abs(d - this.world.lastShot) > 150) {
                this.world.lastShot = d;

                this.world.addDynamicObject(new Missle(this.world.currentX, this.world.currentY, this.world.rotation));
                if (this.gunVer >= 3) {
                    this.world.addDynamicObject(new Missle(this.world.currentX, this.world.currentY, this.world.rotation + 180));
                }
                if (this.gunVer >= 2) {
                    this.world.addDynamicObject(new Missle(this.world.currentX, this.world.currentY, this.world.rotation + 5));
                    this.world.addDynamicObject(new Missle(this.world.currentX, this.world.currentY, this.world.rotation - 5));
                }

                if (this.world.missileFired)
                    this.world.missileFired(thisWorld, this.gunVer);
            }
        }
    }


};

// ## helpers ##

function moveTowardsPrimary(world, point, speed) {

    var xMove = 0;
    var yMove = 0;

    var xDiff = Math.abs(world.currentX - point.x);
    var yDiff = Math.abs(world.currentY - point.y);
    var total = xDiff + yDiff;

    if (total > 0) {

        // move towards ship
        if (world.currentX < point.x)
            xMove = -speed * (xDiff / total);
        if (world.currentX > point.x)
            xMove = speed * (xDiff / total);

        if (world.currentY < point.y)
            yMove = -speed * (yDiff / total);
        if (world.currentY > point.y)
            yMove = speed * (yDiff / total);

        point.x += xMove;
        point.y += yMove;
    }
    return new Point(xMove, yMove);
}

function isClose(p1, p2) {

    if (p1 != null && p2 != null) {
        if (Math.abs(p1.x - p2.x) < 250 &&
        Math.abs(p1.y - p2.y) < 250) {
            return true;
        }
    }
    return false;
}

// calculate distance between two points
function calculateDistance(p1, p2) {
    var xDiff = Math.abs(p1.x - p2.x);
    var yDiff = Math.abs(p1.y - p2.y);

    var dist = Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));
    return dist;
}

function isWithinRadius(p1, pointRadius, radius) {
    var xDiff = Math.abs(p1.x - pointRadius.x);
    var yDiff = Math.abs(p1.y - pointRadius.y);

    var dist = Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));

    if (dist < radius)
        return true;
    return false;
}

function rotationFromVector(vector) {

    var t = 0;
    if (vector.x > 0)
        t = Math.atan(vector.y / vector.x) * 180 / Math.PI + 90;
    else if (vector.x < 0)
        t = Math.atan(vector.y / vector.x) * 180 / Math.PI + 270;

    return t;
}

function getVector(start, end, divider) {
    if (divider <= 0) {
        divider = 1;
    }

    var xd = Math.abs(end.x - start.x);
    var yd = Math.abs(end.y - start.y);

    //var xMult = xd / (xd + yd);
    //var yMult = yd / (xd + yd);

    var vector = new Point((end.x - start.x) / divider,
                           (end.y - start.y) / divider);

    return vector;                                                      
}

