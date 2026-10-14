"""
Render parallax background layers for every zone of Spin Rush with Blender.

Run headless from a Blender install:
    blender -b -P tools/blender/render_backgrounds.py -- --out public/assets/bg --scale 2
or with the bpy module:
    python tools/blender/render_backgrounds.py --out public/assets/bg --scale 2

For each zone it builds a 3D scene (orthographic camera, world lighting, fog)
and renders the layers separately with alpha so the game can scroll them at
different parallax rates. Every layer is horizontally seamless: all geometry
is generated from functions periodic over the layer width.

Output per zone (height = 270 * scale; widths differ per layer so landmarks
repeat less often: sky and far are 1 screen wide, mid 2 screens, near 3):
    <zone>/sky.png   opaque, static, 480*scale wide
    <zone>/far.png   alpha, slowest parallax, 480*scale wide
    <zone>/mid.png   alpha, 960*scale wide
    <zone>/near.png  alpha, fastest parallax, 1440*scale wide
    <zone>/layers.json  parallax rates + vertical anchors for the game
"""
import json
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

# ----------------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------------
argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
OUT = "public/assets/bg"
SCALE = 2
SAMPLES = 64
ONLY = None
i = 0
while i < len(argv):
    a = argv[i]
    if a == "--out":
        OUT = argv[i + 1]
        i += 1
    elif a == "--scale":
        SCALE = int(argv[i + 1])
        i += 1
    elif a == "--samples":
        SAMPLES = int(argv[i + 1])
        i += 1
    elif a == "--zone":
        ONLY = argv[i + 1]
        i += 1
    i += 1

W = 480 * SCALE
H = 270 * SCALE
# World units: 1 unit = 1 game pixel at 480x270. The camera covers y in [0, 270]
# and x in [0, layer width]. Layer widths (in screens): sky 1, far 1, mid 2, near 3.
CAM_W = 480.0
CAM_H = 270.0
LAYER_W = {"sky": CAM_W, "far": CAM_W, "mid": CAM_W * 2, "near": CAM_W * 3}
# The playfield hides everything below this height most of the time.
HORIZON = 108.0


def srgb(hexstr, alpha=1.0):
    h = hexstr.lstrip("#")
    r, g, b = (int(h[k : k + 2], 16) / 255 for k in (0, 2, 4))
    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b), alpha)


# ----------------------------------------------------------------------------
# Scene helpers
# ----------------------------------------------------------------------------
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.cycles.device = "CPU"
    sc.render.resolution_x = W
    sc.render.resolution_y = H
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.color_depth = "8"
    sc.view_settings.view_transform = "Standard"
    sc.render.filter_size = 1.0
    # camera: orthographic, looking down -Y with X right, Z up
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = CAM_W
    cam_data.clip_end = 5000
    cam = bpy.data.objects.new("cam", cam_data)
    cam.location = (CAM_W / 2, -1500, CAM_H / 2)
    cam.rotation_euler = (math.radians(90), 0, 0)
    sc.collection.objects.link(cam)
    sc.camera = cam
    return sc


def material(name, color, rough=0.9, emit=None, emit_strength=1.0, spec=0.2, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = srgb(color)
    bsdf.inputs["Roughness"].default_value = rough
    try:
        bsdf.inputs["Specular IOR Level"].default_value = spec
    except KeyError:
        pass
    if emit:
        bsdf.inputs["Emission Color"].default_value = srgb(emit)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND"
    return m


def gradient_material(name, top, bottom, zmin, zmax):
    """Vertical colour gradient in world Z."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 1.0
    tex = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    nt.links.new(tex.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    mr.inputs["From Min"].default_value = zmin
    mr.inputs["From Max"].default_value = zmax
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    ramp.color_ramp.elements[0].color = srgb(bottom)
    ramp.color_ramp.elements[1].color = srgb(top)
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Emission Color"])
    bsdf.inputs["Emission Strength"].default_value = 0.35
    return m


def link(obj, coll):
    coll.objects.link(obj)


def new_collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def mesh_from_pydata(name, verts, faces, mat, coll, smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    link(ob, coll)
    return ob


def ridge(name, fn, y, zbase, mat, coll, depth=40.0, step=2.0, xmin=-40.0, xmax=None, width=CAM_W):
    if xmax is None:
        xmax = width + 40.0
    """Extruded silhouette: top edge follows fn(x), extends down to zbase, with depth in Y."""
    xs = [xmin + k * step for k in range(int((xmax - xmin) / step) + 1)]
    verts = []
    faces = []
    for x in xs:
        z = fn(x)
        verts.append((x, y, z))
        verts.append((x, y, zbase))
        verts.append((x, y + depth, z))
    n = len(xs)
    for k in range(n - 1):
        a = k * 3
        b = (k + 1) * 3
        faces.append((a, a + 1, b + 1, b))          # front face
        faces.append((a, b, b + 2, a + 2))          # top face (lit)
    return mesh_from_pydata(name, verts, faces, mat, coll)


def plane(name, x, y, z, w, d, mat, coll, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(x, y, z), rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (w, d, 1)
    ob.data.materials.append(mat)
    for c in ob.users_collection:
        c.objects.unlink(ob)
    link(ob, coll)
    return ob


def sphere(name, x, y, z, r, mat, coll, seg=24):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, y, z), segments=seg, ring_count=seg // 2)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    for c in ob.users_collection:
        c.objects.unlink(ob)
    link(ob, coll)
    return ob


def cylinder(name, x, y, z, r, h, mat, coll, rot=(0, 0, 0), verts=16):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x, y, z), rotation=rot, vertices=verts)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    for c in ob.users_collection:
        c.objects.unlink(ob)
    link(ob, coll)
    return ob


def cone(name, x, y, z, r, h, mat, coll, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=0, depth=h, location=(x, y, z), rotation=rot, vertices=12)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    for c in ob.users_collection:
        c.objects.unlink(ob)
    link(ob, coll)
    return ob


def periodic(x, terms, width=CAM_W):
    """Sum of sines with integer numbers of periods over the layer width so it tiles."""
    v = 0.0
    for amp, periods, phase in terms:
        v += amp * math.sin(2 * math.pi * periods * x / width + phase)
    return v


MW = CAM_W * 2  # mid layer width
NW = CAM_W * 3  # near layer width


def vertical_water(name, zbot, ztop, top_col, bot_col, coll, y, width, spec=0.9):
    """Backdrop water/lava: a vertical plane with a height gradient (seen face-on by the side camera)."""
    m = gradient_material(name + "_mat", top_col, bot_col, zbot, ztop)
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.25
    try:
        bsdf.inputs["Specular IOR Level"].default_value = spec
    except KeyError:
        pass
    return plane(name, width / 2, y, (zbot + ztop) / 2, width + 80, ztop - zbot, m, coll, rot=(math.pi / 2, 0, 0))


def sparkles(prefix, z, count, width, coll, y, color="#ffffff", strength=3.0, r=0.9):
    m = material(prefix + "_m", color, emit=color, emit_strength=strength)
    for k in range(count):
        sphere(f"{prefix}{k}", (k * 131.7) % width, y, z + (k * 7) % 18, r, m, coll, seg=6)


def sun_light(energy=4.0, angle_deg=(55, 0, 35), color=(1, 0.95, 0.85)):
    ld = bpy.data.lights.new("sun", "SUN")
    ld.energy = energy
    ld.color = color
    ld.angle = math.radians(2)
    lo = bpy.data.objects.new("sun", ld)
    lo.rotation_euler = tuple(math.radians(a) for a in angle_deg)
    bpy.context.scene.collection.objects.link(lo)
    return lo


def world(color, strength=0.8):
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = srgb(color)
    bg.inputs[1].default_value = strength
    bpy.context.scene.world = w


def palm(x, y, z, scale, coll, trunk_mat, leaf_mat, lean=0.15):
    segs = 7
    px, pz = x, z
    for k in range(segs):
        t = k / segs
        cylinder(f"trunk{x}_{k}", px, y, pz + 6 * scale, 3.2 * scale * (1 - t * 0.3), 13 * scale, trunk_mat, coll, rot=(0, lean, 0))
        px += math.sin(lean) * 12 * scale
        pz += 12 * scale
    top = Vector((px, y, pz + 4 * scale))
    for k in range(7):
        a = math.pi * 1.05 - k * (math.pi * 1.25 / 6)
        for s in range(4):
            tt = s / 4
            lx = top.x + math.cos(a) * (12 + s * 9) * scale
            lz = top.z + math.sin(a) * (12 + s * 9) * scale - tt * tt * 18 * scale
            cone(f"leaf{x}_{k}_{s}", lx, y + (s % 2) * 2, lz, 4.5 * scale * (1 - tt * 0.5), 14 * scale, leaf_mat, coll, rot=(0, math.pi / 2 - a + tt * 0.9, 0))
    for k in range(3):
        sphere(f"coco{x}_{k}", top.x + (k - 1) * 3.5 * scale, y - 2, top.z - 2 * scale, 3 * scale, trunk_mat, coll, seg=12)


def tree_round(x, y, z, scale, coll, trunk_mat, leaf_mat):
    cylinder(f"tt{x}", x, y, z + 14 * scale, 2.5 * scale, 28 * scale, trunk_mat, coll)
    for k, (dx, dz, r) in enumerate([(0, 36, 14), (-10, 28, 10), (10, 29, 11), (0, 24, 12)]):
        sphere(f"tl{x}_{k}", x + dx * scale, y + (k % 2) * 3, z + dz * scale, r * scale, leaf_mat, coll, seg=16)


# ----------------------------------------------------------------------------
# Zones
# ----------------------------------------------------------------------------
def render_layer(sc, colls, name, outdir, keep):
    for c in colls:
        c.hide_render = c.name not in keep
    lw = LAYER_W[name]
    cam = sc.camera
    cam.data.ortho_scale = lw
    cam.location.x = lw / 2
    sc.render.resolution_x = int(lw * SCALE)
    sc.render.resolution_y = H
    sc.render.filepath = os.path.join(outdir, name + ".png")
    bpy.ops.render.render(write_still=True)


def zone_emerald(outdir):
    sc = reset_scene()
    world("#1c58c8", 0.9)
    sun_light(5.0, (50, 0, 30), (1.0, 0.97, 0.9))
    sky = new_collection("sky")
    far = new_collection("far")
    mid = new_collection("mid")
    near = new_collection("near")

    # --- sky (1 screen): gradient, sun, soft clouds ---
    plane("skyplane", CAM_W / 2, 1200, CAM_H / 2, CAM_W * 3, CAM_H * 3, gradient_material("skymat", "#1c58c8", "#a8dcff", 0, CAM_H), sky, rot=(math.pi / 2, 0, 0))
    sphere("sun", 380, 900, 228, 22, material("sunmat", "#fff6b0", emit="#fff2a0", emit_strength=6), sky)
    cloud_mat = material("cloud", "#ffffff", rough=1.0, emit="#ffffff", emit_strength=0.25)
    for cx, cz, sc_ in [(40, 236, 1.0), (210, 212, 0.7), (330, 248, 1.2), (470, 204, 0.8)]:
        for dx, dz, r in [(0, 0, 11), (13, 5, 13), (28, 0, 11), (14, -4, 10)]:
            sphere(f"cl{cx}_{dx}", cx + dx * sc_, 800, cz + dz * sc_, r * sc_, cloud_mat, sky, seg=14)

    # --- far (1 screen): two mountain ridges with snow, above the horizon ---
    mtn1 = material("mtn1", "#2f5cb8", rough=1.0)
    mtn2 = material("mtn2", "#3d6fc4", rough=1.0)
    snow = material("snow", "#e8f0ff", rough=1.0, emit="#e8f0ff", emit_strength=0.2)
    f1 = lambda x: 196 + periodic(x, [(26, 1, 0.0), (12, 3, 1.0), (8, 5, 2.0), (5, 9, 0.5)])
    f2 = lambda x: 176 + periodic(x, [(20, 2, 1.5), (10, 4, 0.3), (6, 7, 2.6)])
    ridge("mtn_far", f1, 600, HORIZON + 30, mtn1, far, depth=60)
    ridge("mtn_near", f2, 520, HORIZON + 30, mtn2, far, depth=60)
    for px_ in range(0, 481, 4):
        if f1(px_) > 212:
            sphere(f"snow{px_}", px_, 598, f1(px_) - 1, 5, snow, far, seg=8)

    # --- mid (2 screens): sea backdrop, cliff with waterfall, islands ---
    vertical_water("sea", HORIZON - 40, 168, "#3b8ff0", "#163f90", mid, 470, MW)
    sparkles("seaspark", 150, 40, MW, mid, 465, strength=2.0, r=0.7)
    cliff = material("cliff", "#7a4a1e", rough=1.0)
    grasst = material("grasstop", "#2f9e33", rough=1.0)
    water = material("water", "#3f8fe8", rough=0.2, spec=0.8, emit="#8fd0ff", emit_strength=0.3)
    foam = material("foam", "#ffffff", rough=1.0, emit="#ffffff", emit_strength=0.5)
    leafd = material("leafd", "#1e7a2a", rough=1.0)
    cx = 300
    plane("cliffbody", cx, 450, 190, 120, 60, cliff, mid, rot=(math.pi / 2, 0, 0))
    plane("cliffshade", cx + 55, 449, 190, 10, 60, material("cliffsh", "#5a3412", rough=1.0), mid, rot=(math.pi / 2, 0, 0))
    plane("clifftop", cx, 450, 221, 124, 6, grasst, mid, rot=(math.pi / 2, 0, 0))
    plane("fall", cx + 10, 440, 188, 20, 58, water, mid, rot=(math.pi / 2, 0, 0))
    for k in range(6):
        sphere(f"foam{k}", cx + 2 + k * 3.5, 436, 161, 3, foam, mid, seg=8)
    palm(cx - 48, 445, 222, 0.8, mid, cliff, leafd)
    palm(cx + 52, 445, 222, 0.7, mid, cliff, material("leafd2", "#2a9a3a", rough=1.0))
    isl = material("isl", "#1e6a2a", rough=1.0)
    for k, ix in enumerate((120, 640, 840)):
        sphere(f"island{k}", ix, 420, 150, 26 - k * 4, isl, mid, seg=16)
        palm(ix, 400, 160, 0.5, mid, cliff, isl)

    # --- near (3 screens): rolling hills with trees and flowers ---
    hill = material("hill", "#3f9f3a", rough=1.0)
    hill2 = material("hill2", "#2f8a2f", rough=1.0)
    fh = lambda x: 150 + periodic(x, [(14, 4, 1.0), (5, 13, 0.4)], NW)
    fh2 = lambda x: 132 + periodic(x, [(10, 7, 2.2), (4, 17, 1.1)], NW)
    ridge("hill_a", fh, 160, HORIZON - 40, hill, near, depth=90, width=NW)
    ridge("hill_b", fh2, 120, HORIZON - 40, hill2, near, depth=90, width=NW)
    trunk = material("trunk", "#6a3f18", rough=1.0)
    leaf = material("leaf", "#2a9a3a", rough=1.0)
    for tx in (60, 250, 430, 620, 810, 1000, 1190, 1380):
        tree_round(tx, 150, fh(tx) - 4, 0.6, near, trunk, leaf)
    fl = material("flower", "#ffd23f", rough=1.0, emit="#ffd23f", emit_strength=0.4)
    for k in range(54):
        fx = (k * 29) % NW
        sphere(f"fl{k}", fx, 118 - (k % 3) * 8, fh2(fx) - 6 - (k % 3) * 6, 1.6, fl, near, seg=8)
    colls = [sky, far, mid, near]
    for name in ("sky", "far", "mid", "near"):
        render_layer(sc, colls, name, outdir, {name})
    return {"sky": {"rate": 0.0}, "far": {"rate": 0.1}, "mid": {"rate": 0.25}, "near": {"rate": 0.5}}


def zone_sunset(outdir):
    sc = reset_scene()
    world("#e2603a", 0.7)
    sun_light(3.0, (80, 0, 20), (1.0, 0.75, 0.55))
    sky = new_collection("sky")
    far = new_collection("far")
    mid = new_collection("mid")
    near = new_collection("near")
    plane("skyplane", CAM_W / 2, 1200, CAM_H / 2, CAM_W * 3, CAM_H * 3, gradient_material("skymat", "#4a2a7a", "#ffc46a", 0, CAM_H), sky, rot=(math.pi / 2, 0, 0))
    sphere("sun", 300, 900, 186, 32, material("sunmat", "#ffe08a", emit="#ffd060", emit_strength=8), sky)
    dune1 = material("dune1", "#7a3a6a", rough=1.0)
    dune2 = material("dune2", "#8a4a6a", rough=1.0)
    ridge("dune_far", lambda x: 186 + periodic(x, [(18, 1, 0.2), (8, 4, 1.4)]), 600, HORIZON + 30, dune1, far, depth=80)
    ridge("dune_mid", lambda x: 172 + periodic(x, [(14, 2, 2.0), (6, 5, 0.6)]), 520, HORIZON + 30, dune2, far, depth=80)
    # mid: sea, lighthouse, boats
    vertical_water("sea", HORIZON - 40, 164, "#f08a5a", "#6a2a4a", mid, 470, MW)
    sparkles("seaspark", 148, 40, MW, mid, 465, color="#ffe0b0", strength=2.5, r=0.7)
    rock = material("rock", "#5a2a4a", rough=1.0)
    white = material("white", "#e8e8f0", rough=0.8)
    red = material("red", "#e84040", rough=0.8)
    lamp = material("lamp", "#fff6a0", emit="#fff6a0", emit_strength=10)
    sphere("lrock", 360, 460, 150, 30, rock, mid, seg=14)
    cylinder("ltower", 360, 450, 186, 7, 50, white, mid)
    cylinder("lband1", 360, 449, 178, 7.3, 6, red, mid)
    cylinder("lband2", 360, 449, 196, 7.3, 6, red, mid)
    sphere("llamp", 360, 450, 214, 6, lamp, mid, seg=10)
    sail = material("sail", "#2a1030", rough=1.0)
    for bx in (90, 240, 600, 820):
        plane(f"hull{bx}", bx, 420, 158, 24, 4, sail, mid, rot=(math.pi / 2, 0, 0))
        cone(f"sailc{bx}", bx + 2, 418, 170, 7, 20, sail, mid)
    # near: dunes with palms and umbrellas
    sand = material("sand", "#d8a860", rough=1.0)
    sand2 = material("sand2", "#e0a850", rough=1.0)
    ridge("sand_a", lambda x: 148 + periodic(x, [(12, 4, 0.4), (4, 15, 1.0)], NW), 160, HORIZON - 40, sand, near, depth=90, width=NW)
    ridge("sand_b", lambda x: 132 + periodic(x, [(10, 7, 2.1), (3, 19, 0.2)], NW), 120, HORIZON - 40, sand2, near, depth=90, width=NW)
    trunk = material("trunk", "#6a3f18", rough=1.0)
    leaf = material("leaf", "#2a9a3a", rough=1.0)
    for tx in (40, 300, 520, 760, 980, 1240, 1400):
        palm(tx, 150, 142, 0.7, near, trunk, leaf, lean=0.25)
    colls = [sky, far, mid, near]
    for name in ("sky", "far", "mid", "near"):
        render_layer(sc, colls, name, outdir, {name})
    return {"sky": {"rate": 0.0}, "far": {"rate": 0.1}, "mid": {"rate": 0.25}, "near": {"rate": 0.5}}


def zone_ruins(outdir):
    sc = reset_scene()
    world("#3c2a78", 0.5)
    sun_light(1.5, (60, 0, -30), (0.7, 0.75, 1.0))
    sky = new_collection("sky")
    far = new_collection("far")
    mid = new_collection("mid")
    near = new_collection("near")
    plane("skyplane", CAM_W / 2, 1200, CAM_H / 2, CAM_W * 3, CAM_H * 3, gradient_material("skymat", "#1a1040", "#7a58b0", 0, CAM_H), sky, rot=(math.pi / 2, 0, 0))
    moon = material("moon", "#f0f0d8", emit="#f0f0d8", emit_strength=3)
    sphere("moon", 390, 900, 226, 20, moon, sky)
    starm = material("star", "#ffffff", emit="#ffffff", emit_strength=6)
    for k in range(70):
        sphere(f"st{k}", (k * 97) % 480, 950, 160 + (k * 53) % 108, 0.7 + (k % 3) * 0.3, starm, sky, seg=6)
    # far: ruin silhouettes
    stone = material("stone", "#2a2058", rough=1.0)
    base = HORIZON + 70
    for k in range(5):
        cx = 30 + k * 100
        cylinder(f"col{k}", cx, 600, base + 30 + (k % 2) * 10, 6, 60 + (k % 2) * 20, stone, far)
        plane(f"cap{k}", cx, 598, base + 61 + (k % 2) * 20, 20, 5, stone, far, rot=(math.pi / 2, 0, 0))
    plane("archl", 250, 600, base + 25, 10, 50, stone, far, rot=(math.pi / 2, 0, 0))
    plane("archr", 310, 600, base + 25, 10, 50, stone, far, rot=(math.pi / 2, 0, 0))
    # arch: a half ring built from short blocks so the side camera sees an arch, not a disc
    for k in range(9):
        a = math.pi * k / 8
        plane(f"arch{k}", 280 + math.cos(a) * 30, 600, base + 50 + math.sin(a) * 30, 12, 12, stone, far, rot=(math.pi / 2, 0, a))
    plane("farfill", CAM_W / 2, 610, (HORIZON + 30 + base) / 2, CAM_W + 80, base - HORIZON - 30, stone, far, rot=(math.pi / 2, 0, 0))
    # mid: temples with lit windows, misted hills
    stone2 = material("stone2", "#3c2e74", rough=1.0)
    win = material("win", "#ffd890", emit="#ffd890", emit_strength=2)
    for tx in (120, 560, 800):
        plane(f"temple{tx}", tx, 520, base + 10, 70, 60, stone2, mid, rot=(math.pi / 2, 0, 0))
        plane(f"templeroof{tx}", tx, 519, base + 42, 90, 6, stone2, mid, rot=(math.pi / 2, 0, 0))
        for wy in range(3):
            for wx in range(4):
                if (wx + wy + tx) % 3:
                    plane(f"w{tx}{wx}{wy}", tx - 25 + wx * 16, 517, base - 4 + wy * 14, 6, 9, win, mid, rot=(math.pi / 2, 0, 0))
    hill = material("hillr", "#2f6a4a", rough=1.0)
    ridge("rh1", lambda x: 160 + periodic(x, [(16, 3, 1.0), (6, 11, 0.4)], MW), 300, HORIZON - 40, hill, mid, depth=80, width=MW)
    mist = material("mist", "#c8d0ff", rough=1.0, alpha=0.25)
    plane("mist", MW / 2, 200, 150, MW + 80, 30, mist, mid, rot=(math.pi / 2, 0, 0))
    # near: closer hills, vines from the top, fireflies
    hill2 = material("hillr2", "#3f8a5a", rough=1.0)
    ridge("rh2", lambda x: 140 + periodic(x, [(12, 5, 2.2), (5, 17, 1.4)], NW), 220, HORIZON - 40, hill2, near, depth=80, width=NW)
    vine = material("vine", "#1e5a3a", rough=1.0)
    for k in range(36):
        vx = (k * 97 + 20) % NW
        ln = 30 + (k * 23) % 50
        cylinder(f"vine{k}", vx, 150, CAM_H - ln / 2, 1, ln, vine, near)
        for s_ in range(0, ln, 9):
            sphere(f"vl{k}_{s_}", vx + (3 if s_ % 2 else -3), 150, CAM_H - s_ - 4, 2.2, vine, near, seg=8)
    ff = material("ff", "#dcff78", emit="#dcff78", emit_strength=8)
    for k in range(40):
        sphere(f"ff{k}", (k * 97) % NW, 140, 120 + (k * 23) % 80, 1.0, ff, near, seg=6)
    colls = [sky, far, mid, near]
    for name in ("sky", "far", "mid", "near"):
        render_layer(sc, colls, name, outdir, {name})
    return {"sky": {"rate": 0.0}, "far": {"rate": 0.12}, "mid": {"rate": 0.3}, "near": {"rate": 0.6}}


def zone_magma(outdir):
    sc = reset_scene()
    world("#3a0c10", 0.4)
    sun_light(1.0, (120, 0, 0), (1.0, 0.5, 0.3))
    sky = new_collection("sky")
    far = new_collection("far")
    mid = new_collection("mid")
    near = new_collection("near")
    plane("skyplane", CAM_W / 2, 1200, CAM_H / 2, CAM_W * 3, CAM_H * 3, gradient_material("skymat", "#100408", "#6a1a12", 0, CAM_H), sky, rot=(math.pi / 2, 0, 0))
    cave = material("cave", "#2a0a10", rough=1.0)
    cave2 = material("cave2", "#3a1218", rough=1.0)
    glow = material("glow", "#ff8a30", emit="#ff8a30", emit_strength=6)

    def ceil_fn(x, base, amp, width):
        return CAM_H - base - abs(periodic(x, [(amp, 6, 0.0), (amp * 0.4, 13, 1.0)], width))

    def ceiling(name, base, amp, y, mat, coll, width):
        xs = [-40 + k * 3 for k in range(int((width + 80) / 3) + 1)]
        verts, faces = [], []
        for x in xs:
            verts.append((x, y, CAM_H + 10))
            verts.append((x, y, ceil_fn(x, base, amp, width)))
        for k in range(len(xs) - 1):
            a = k * 2
            faces.append((a, a + 1, a + 3, a + 2))
        mesh_from_pydata(name, verts, faces, mat, coll)

    ceiling("ceil1", 30, 36, 600, cave, far, CAM_W)
    ceiling("ceil2", 50, 36, 520, cave2, far, CAM_W)
    for k in range(10):
        gx = 24 + k * 48
        sphere(f"tip{k}", gx, 518, ceil_fn(gx, 50, 36, CAM_W) - 1, 2.0, glow, far, seg=8)
    # mid: lava sea, rock pillars, lava falls
    vertical_water("lavasea", HORIZON - 40, 150, "#ffb030", "#8a1800", mid, 470, MW, spec=0.5)
    sparkles("lavaspark", 136, 30, MW, mid, 465, color="#ffe080", strength=6, r=1.2)
    pillar = material("pillar", "#3a1a18", rough=1.0)
    for px_, w, h in [(80, 26, 110), (250, 18, 80), (400, 30, 130), (600, 22, 90), (760, 28, 120), (900, 16, 70)]:
        plane(f"pil{px_}", px_, 450, HORIZON + h / 2, w, h + 60, pillar, mid, rot=(math.pi / 2, 0, 0))
        plane(f"pilg{px_}", px_ - w / 2 + 8, 449, HORIZON + 40, 2, 12, glow, mid, rot=(math.pi / 2, 0, 0))
    lava = material("lava", "#ff7a1a", rough=0.6, emit="#ff6a10", emit_strength=3)
    for fx in (330, 700):
        plane(f"lavafall{fx}", fx, 440, 190, 14, 80, lava, mid, rot=(math.pi / 2, 0, 0))
    # near: dark rock bank, crystals, embers
    bank = material("bank", "#2a1210", rough=1.0)
    ridge("bank", lambda x: 136 + periodic(x, [(10, 5, 0.5), (4, 19, 1.9)], NW), 160, HORIZON - 40, bank, near, depth=90, width=NW)
    crystal = material("crystal", "#b060ff", rough=0.3, emit="#9a48e0", emit_strength=1.5, alpha=0.9)
    for k, cx in enumerate((70, 330, 450, 700, 900, 1100, 1300)):
        cone(f"cr{k}", cx, 150, 150, 6, 30, crystal, near)
        cone(f"cr{k}b", cx - 8, 152, 145, 4, 20, crystal, near)
    ember = material("ember", "#ffd060", emit="#ff9040", emit_strength=8)
    for k in range(60):
        sphere(f"em{k}", (k * 53) % NW, 140, 120 + (k * 37) % 140, 0.8, ember, near, seg=6)
    colls = [sky, far, mid, near]
    for name in ("sky", "far", "mid", "near"):
        render_layer(sc, colls, name, outdir, {name})
    return {"sky": {"rate": 0.0}, "far": {"rate": 0.12}, "mid": {"rate": 0.3}, "near": {"rate": 0.5}}


def zone_sky(outdir):
    sc = reset_scene()
    world("#1a2c7a", 0.6)
    sun_light(2.5, (40, 0, 40), (0.8, 0.85, 1.0))
    sky = new_collection("sky")
    far = new_collection("far")
    mid = new_collection("mid")
    near = new_collection("near")
    plane("skyplane", CAM_W / 2, 1200, CAM_H / 2, CAM_W * 3, CAM_H * 3, gradient_material("skymat", "#060a2a", "#5a7ad0", 0, CAM_H), sky, rot=(math.pi / 2, 0, 0))
    starm = material("star", "#ffffff", emit="#ffffff", emit_strength=6)
    for k in range(70):
        sphere(f"st{k}", (k * 97) % 480, 950, 130 + (k * 53) % 138, 0.7 + (k % 3) * 0.3, starm, sky, seg=6)
    moon = material("moon", "#e8e8ff", emit="#e8e8ff", emit_strength=3)
    sphere("moon", 80, 900, 230, 14, moon, sky)
    cloud = material("cloudf", "#c8d8ff", rough=1.0)
    for k, (cx, cz, s_) in enumerate([(30, 180, 1.6), (180, 160, 1.2), (300, 190, 1.8), (420, 155, 1.1)]):
        for dx, dz, r in [(0, 0, 11), (13, 5, 13), (28, 0, 11), (14, -4, 10)]:
            sphere(f"fc{k}_{dx}", cx + dx * s_, 600, cz + dz * s_, r * s_, cloud, far, seg=12)
    # mid: skyline (2 screens)
    tower = material("tower", "#1e2848", rough=0.9)
    tower2 = material("tower2", "#28345a", rough=0.9)
    winl = material("winl", "#ffe090", emit="#ffe090", emit_strength=4)
    towers = [(0, 90, 28), (50, 120, 22), (90, 70, 36), (140, 140, 26), (180, 95, 30), (222, 115, 24), (270, 80, 30), (320, 130, 24), (370, 100, 34), (430, 115, 26)]
    towers += [(t[0] + 480, t[1] - 10 + (k % 3) * 12, t[2]) for k, t in enumerate(towers)]
    for k, (tx, th, tw) in enumerate(towers):
        plane(f"tw{k}", tx + tw / 2, 480, HORIZON - 30 + th / 2, tw, th + 60, tower if k % 2 else tower2, mid, rot=(math.pi / 2, 0, 0))
        for wy in range(8, th - 4, 9):
            for wx in range(4, tw - 4, 7):
                if (wx * 7 + wy * 13) % 5 == 0:
                    plane(f"wl{k}_{wx}_{wy}", tx + wx, 478, HORIZON - 30 + wy, 2, 3, winl, mid, rot=(math.pi / 2, 0, 0))
    # near: cloud sea and floating islands (3 screens)
    cloudn = material("cloudn", "#ffffff", rough=1.0)
    for k in range(18):
        cx = (k * 83) % NW
        cz = 112 + (k * 17) % 24
        s_ = 1.0 + (k % 3) * 0.25
        for dx, dz, r in [(0, 0, 11), (13, 5, 13), (28, 0, 11), (14, -4, 10)]:
            sphere(f"nc{k}_{dx}", cx + dx * s_, 160, cz + dz * s_, r * s_, cloudn, near, seg=12)
    rockm = material("rockm", "#4a5068", rough=1.0)
    grassm = material("grassm", "#e0b030", rough=1.0)
    for k, ix in enumerate((120, 400, 760, 1100, 1350)):
        cone(f"isl{k}", ix, 150, 150, 30, 30, rockm, near, rot=(math.pi, 0, 0))
        plane(f"islt{k}", ix, 149, 165, 60, 4, grassm, near, rot=(math.pi / 2, 0, 0))
    colls = [sky, far, mid, near]
    for name in ("sky", "far", "mid", "near"):
        render_layer(sc, colls, name, outdir, {name})
    return {"sky": {"rate": 0.0}, "far": {"rate": 0.1}, "mid": {"rate": 0.25}, "near": {"rate": 0.5}}


ZONES = {"emerald": zone_emerald, "sunset": zone_sunset, "ruins": zone_ruins, "magma": zone_magma, "sky": zone_sky}

if __name__ == "__main__":
    for name, fn in ZONES.items():
        if ONLY and name != ONLY:
            continue
        outdir = os.path.join(OUT, name)
        os.makedirs(outdir, exist_ok=True)
        print(f"== rendering {name} -> {outdir}")
        meta = fn(outdir)
        meta["width"] = W
        meta["height"] = H
        meta["scale"] = SCALE
        meta["layerWidths"] = {k: int(v * SCALE) for k, v in LAYER_W.items()}
        with open(os.path.join(outdir, "layers.json"), "w") as f:
            json.dump(meta, f, indent=2)
        print(f"   done {name}")
