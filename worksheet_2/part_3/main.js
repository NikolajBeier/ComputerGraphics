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
    var trianglePoints = [];

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

    document.getElementById("point-mode").addEventListener("click", function () {
        mode = "point";
        console.log("Switched to Point Mode");
    });

    document.getElementById("triangle-mode").addEventListener("click", function () {
        mode = "triangle";
        trianglePoints = [];
        console.log("Switched to Triangle Mode");
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
            trianglePoints.push({ position: mousePos, color: pointColor });

            if (trianglePoints.length === 3) {
                for (const point of trianglePoints) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
                    gl.bufferSubData(gl.ARRAY_BUFFER, index * 8, new Float32Array(point.position));

                    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
                    gl.bufferSubData(gl.ARRAY_BUFFER, index * 16, new Float32Array(point.color));

                    index++;
                }
                trianglePoints = [];
            }
        }
        render();
    });

    // Clear canvas button event listener
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
        } else if (mode === "triangle") {
            gl.drawArrays(gl.TRIANGLES, 0, index);
        }
    }
};
