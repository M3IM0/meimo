'use strict';

/**
 * Creates the material for the layers
 * @param {String} noiseShader - The shader part containing noise functions
 * @return {THREE.ShaderMaterial} The newely created shader material
 */
function createLayerShaderMaterial(noiseShader, uniforms) {
	return new THREE.ShaderMaterial({
		transparent: true,

		uniforms: uniforms,
		vertexShader: '\n\t\tuniform vec3 scale;\n\t\tvarying vec3 vPosition;\n\n\t\tvoid main() {\n\t\t\tvPosition = position;\n\n\t\t\tgl_Position = projectionMatrix *\n\t\t\t\tmodelViewMatrix *\n\t\t\t\tvec4(position, 1.0);\n\t\t}',

		fragmentShader: noiseShader + '\n\t\tuniform float time;\n\t\tvarying vec3 vPosition;\n\t\t\n\t\tvoid main() {\n\t\t\t// Determine base colors\n\t\t\tvec3 base = vec3(.55, .3, 1.0);\n\t\t\tvec3 top = vec3(.53, .89, .84);\n\n\t\t\t// Calculate offset\n\t\t\tfloat timeMultiplier1 = .25;\n\t\t\tvec3 offset1 = vec3(\n\t\t\t\ttime * timeMultiplier1,\n\t\t\t\ttime * timeMultiplier1,\n\t\t\t\ttime * timeMultiplier1\n\t\t\t);\n\t\t\tfloat timeMultiplier2 = .333;\n\t\t\tvec3 offset2 = vec3(\n\t\t\t\ttime * -timeMultiplier2,\n\t\t\t\ttime * -timeMultiplier2,\n\t\t\t\ttime * -timeMultiplier2\n\t\t\t);\n\t\t\t\n\t\t\t// Generate and normalize noise\n\t\t\tfloat noiseScale = 1.5;\n\t\t\tfloat random1 = snoise(vPosition * noiseScale + offset1);\n\t\t\tfloat random2 = snoise(vPosition * noiseScale + offset2);\n      // Mix the two randoms, then normalize output\n\t\t\tfloat random = ((random1 + random2) / 2.0) + 1.0 / 2.0;\n\t\t\t\n\t\t\t// Offset noise a little to create the intensity\n\t\t\tfloat intensityOffset = .3;\n\t\t\tfloat intensity = max(.0, floor(random + intensityOffset));\n\t\t\t\n\t\t\t// Calculate final color\n\t\t\tvec3 color = base + (top - base) * vPosition.z + intensity * .1;\n\n\t\t\t// Calculate final alpha\n\t\t\tfloat alphaBase = .1;\n\t\t\tfloat alphaMultiplier = 1.0 - alphaBase;\n\t\t\tfloat alpha = intensity * alphaMultiplier + alphaBase;\n\n\t\t\tgl_FragColor = vec4(color, alpha);\n\t\t}'
	});
}

/**
 * Creates a new layer
 * @param {Number} y - The y-coordinate to position the layer at
 * @param {THREE.Material} material - The layer material
 * @return {THREE.Mesh} The newely created layer
 */
function createLayer(y, material) {
	var geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
	geometry.vertices = geometry.vertices.map(function (vertex) {
		return new THREE.Vector3(vertex.x, vertex.y, y);
	});

	var mesh = new THREE.Mesh(geometry, material);
	mesh.rotation.x = -Math.PI / 2;
	return mesh;
}

/**
 * Creates a complete scene
 * 1. Loads assets
 * 2. Creates new scene
 * 3. Create shader material
 * 4. Add the layers to the scene
 * 5. Returns the scene
 *
 * @return {Promise}
 */
function createBox(layerShaderUniforms) {
	var box = new THREE.Object3D();

	return new Promise(function (resolve, reject) {
		fetch('https://raw.githubusercontent.com/ashima/webgl-noise/master/src/noise3D.glsl').then(function (response) {
			return response.text();
		}).then(function (noiseShader) {
			var layerMaterial = createLayerShaderMaterial(noiseShader, layerShaderUniforms);
			var layerCount = 32;

			for (var i = 0; i < layerCount; i++) {
				box.add(createLayer(i / layerCount, layerMaterial));
			}

			resolve(box);
		}).catch(reject);
	});
}

/**
 * Get a proxy function to debounce a function call
 */
function getDebounceFunction(func, delay) {
	var timeout = undefined;

	return function () {
		var _window;

		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		if (timeout) {
			window.clearTimeout(timeout);
		}

		timeout = (_window = window).setTimeout.apply(_window, [func, delay].concat(args));
	};
}

/**
 * Handle mouse movement
 * @param {Event} e - The mouse event
 */
function mouseMoveHandler(e) {
	var angle = e.clientX / window.innerWidth * Math.PI * 2;
	setCameraPosition(angle);
}

/**
 * Update camera position by angle
 * @param {Number} angle - The angle, obviously
 */
function setCameraPosition(angle) {
	// Add 45 degrees to angle, so it starts at the corner <:
	angle += Math.PI / 4;

	camera.position.set(Math.cos(angle) * cameraDistance, cameraDistance, Math.sin(angle) * cameraDistance);

	camera.lookAt(cameraTarget);
}

/**
 * Resize the WebGL canvas to match current viewport
 */
function resize() {
	var aspect = window.innerWidth / window.innerHeight;

	camera.left = cameraWidth / -2 * aspect;
	camera.right = cameraWidth / 2 * aspect;
	camera.top = cameraHeight / 2;
	camera.bottom = cameraHeight / -2;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Simply renders the WebGL canvas
 */
function render() {
	layerShaderUniforms.time.value = time.getElapsedTime();
	renderer.render(scene, camera);
}

/**
 * Start the animation loop
 */
function loop() {
	requestAnimationFrame(loop);
	render();
}

var box = undefined;
var cameraHeight = 2;
var cameraWidth = 2;
var cameraDistance = 4;
var cameraTarget = new THREE.Vector3(0, .5, 0);
var time = new THREE.Clock();

// Initalize camera
var camera = new THREE.OrthographicCamera(0, 0, 0, 0, 1, 1024);
setCameraPosition(0);

var scene = new THREE.Scene();

// Initialize renderer
var renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', getDebounceFunction(resize, 100));
window.addEventListener('mousemove', mouseMoveHandler);

var layerShaderUniforms = {
	time: {
		value: 0
	},
	scale: {
		value: new THREE.Vector3(1, 1, 0)
	}
};

createBox(layerShaderUniforms).then(function (newBox) {
	box = newBox;
	scene.add(box);

	resize();
	loop();
});