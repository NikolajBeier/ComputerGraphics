/**
 * @param {Element} canvas. The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
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

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, maxVertices * 8, gl.STATIC_DRAW);

    // Associate shaders with buffers
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, maxVertices * 16, gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    function getMousePosition(event) {
        const rect = event.target.getBoundingClientRect();
        const x = 2 * (event.clientX - rect.left) / rect.width - 1;
        const y = 2 * (rect.bottom - event.clientY) / rect.height - 1;
        return [x, y];
    }

    function parseColor(value) {
        return value.split(',').map(Number);
    }

    canvas.addEventListener("click", function (event) {
        const mousePos = getMousePosition(event); // Get mouse position
        const pointColor = parseColor(document.getElementById("point-color").value);

        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * 8, new Float32Array(mousePos));

        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * 16, new Float32Array(pointColor));

        index++;
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
        gl.drawArrays(gl.POINTS, 0, index);
    }
};
