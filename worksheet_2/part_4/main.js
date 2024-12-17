function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var canvas = document.getElementById("gl-canvas");
canvas.width = 512;
canvas.height = 512;

var gl = setupWebGL(canvas);
gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

window.onload = function init() {
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var maxVertices = 1000;
    var index = 0;
    var circlePoints = [];

    // Create and bind position buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, maxVertices * 8, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, maxVertices * 16, gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    let mode = "point";
    let circleCenter = null;

    document.getElementById("point-mode").addEventListener("click", function () {
        mode = "point";
        console.log("Switched to Point Mode");
    });

    document.getElementById("triangle-mode").addEventListener("click", function () {
        mode = "triangle";
        circlePoints = [];
        console.log("Switched to Triangle Mode");
    });

    document.getElementById("circle-mode").addEventListener("click", function () {
        mode = "circle";
        circleCenter = null;
        console.log("Switched to Circle Mode");
    });

    function getMousePosition(event) {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width * 2 - 1;
        const y = (rect.bottom - event.clientY) / rect.height * 2 - 1;
        return [x, y];
    }

    function parseColor(value) {
        return value.split(',').map(Number);
    }

    function addCircle(center, radius, color) {
        const numSegments = 100;
        const angleStep = (2 * Math.PI) / numSegments;

        let vertices = [center[0], center[1]];
        let colors = [...color];

        for (let i = 0; i <= numSegments; i++) {
            const angle = i * angleStep;
            const x = center[0] + radius * Math.cos(angle);
            const y = center[1] + radius * Math.sin(angle);

            vertices.push(x, y);
            colors.push(...color);
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * 8, new Float32Array(vertices));

        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * 16, new Float32Array(colors));

        index += vertices.length / 2;
    }

    canvas.addEventListener("click", function (event) {
        const mousePos = getMousePosition(event);
        const pointColor = parseColor(document.getElementById("point-color").value);

        if (mode === "point") {
            gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, index * 8, new Float32Array(mousePos));

            gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, index * 16, new Float32Array(pointColor));

            index++;
        } else if (mode === "triangle") {
            circlePoints.push({ position: mousePos, color: pointColor });

            if (circlePoints.length === 3) {
                for (const point of circlePoints) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
                    gl.bufferSubData(gl.ARRAY_BUFFER, index * 8, new Float32Array(point.position));

                    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
                    gl.bufferSubData(gl.ARRAY_BUFFER, index * 16, new Float32Array(point.color));

                    index++;
                }
                circlePoints = [];
            }
        } else if (mode === "circle") {
            if (!circleCenter) {
                circleCenter = mousePos;
            } else {
                const dx = mousePos[0] - circleCenter[0];
                const dy = mousePos[1] - circleCenter[1];
                const radius = Math.sqrt(dx * dx + dy * dy);

                addCircle(circleCenter, radius, pointColor);
                circleCenter = null;
            }
        }
        render();
    });

    document.getElementById("clear-canvas").addEventListener("click", function () {
        const clearColor = parseColor(document.getElementById("clear-color").value);
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.clear(gl.COLOR_BUFFER_BIT);
        index = 0;
    });

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (mode === "point") {
            gl.drawArrays(gl.POINTS, 0, index);
        } else if(mode === "circle"){
            gl.drawArrays(gl.TRIANGLE_FAN, 0, index);
        } else
            gl.drawArrays(gl.TRIANGLES, 0, index);
    }
};
