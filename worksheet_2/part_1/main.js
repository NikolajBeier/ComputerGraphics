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

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    function getMousePosition(event) {
        const rect = event.target.getBoundingClientRect();
        const x = 2 * (event.clientX - rect.left) / canvas.width - 1;
        const y = 2 * (canvas.height - (event.clientY - rect.top)) / canvas.height - 1;
        return [x, y];
    }

    canvas.addEventListener("click", function (event) {
        const mousePos = getMousePosition(event);
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, index * 8, new Float32Array(mousePos));
        index++;

        render();
    });

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, index);
    }
};
