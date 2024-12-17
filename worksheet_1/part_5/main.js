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
    gl.useProgram(program);

    const center = [0.0, 0.0];
    const radius = 0.5;
    const numTriangles = 50;

    let vertices = [center[0], center[1]];
    const colors = [1.0, 1.0, 1.0];

    for (let i = 0; i <= numTriangles; i++) {
        const angle = (i / numTriangles) * 2 * Math.PI;
        vertices.push(center[0] + radius * Math.cos(angle));
        vertices.push(center[1] + radius * Math.sin(angle));

        colors.push(Math.cos(angle), Math.sin(angle), (Math.cos(angle) + Math.sin(angle)) / 2);
    }

    const colorData = new Float32Array(colors);

    function createBuffer(data, attribute, size) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        const location = gl.getAttribLocation(program, attribute);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
    }

    createBuffer(colorData, "vColor", 3);

    let bounce = 0;
    let direction = 1;

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);

        bounce += 0.005 * direction;
        if (bounce > 0.5 || bounce < -0.5) direction *= -1;

        vertices = [center[0], center[1] + bounce];
        for (let i = 0; i <= numTriangles; i++) {
            const angle = (i / numTriangles) * 2 * Math.PI;
            vertices.push(center[0] + radius * Math.cos(angle));
            vertices.push(center[1] + radius * Math.sin(angle) + bounce);
        }

        createBuffer(new Float32Array(vertices), "vPosition", 2);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 2);

        requestAnimationFrame(render);
    }

    render();
};