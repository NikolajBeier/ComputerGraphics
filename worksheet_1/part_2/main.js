/**
 * @param {Element} canvas. The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var canvas = document.getElementById("gl-canvas");
canvas.width = 512;//window.innerWidth;
canvas.height = 512//window.innerHeight;
var gl = setupWebGL(canvas);
gl.clearColor(0.3921, 0.5843, 0.9294, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

window.onload = function init() {
    var program = initShaders(gl, "vertex-shader", "fragment-shader");

    function createBuffer(data, attribute, size) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        const location = gl.getAttribLocation(program, attribute);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
    }

    const vertices = new Float32Array([
        0,0,
        1,0,
        1,1
    ])

    createBuffer(vertices, "vPosition", 2);

    function render() {
        setTimeout(function () {
            gl.clear(gl.COLOR_BUFFER_BIT);

            gl.drawArrays(gl.POINTS, 0, 3)
            requestAnimationFrame(render);
        })
    }
    gl.useProgram(program);
    render();
}