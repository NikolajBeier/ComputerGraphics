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

    function render() {
        setTimeout(function () {
            gl.clear(gl.COLOR_BUFFER_BIT);

            requestAnimationFrame(render);
        })
    }
    gl.useProgram(program);
    render();
}