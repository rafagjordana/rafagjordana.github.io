/* @pjs preload="images/rafa.png"; */

/**** Configuration ********************************/
/**/ final int number_of_particles = 500;
/**/ final String image_path = "images/rafa.png";

// BezierAnimation animation;
PImage test;
parent.document.getElementById("bezier").setAttribute("style", "background-color:transparent; border:0px;");

int _number_of_particles;
PImage _input, _result;
Particle _particles[];
PVector _endpoints[];
int _dimx, _dimy;
var _particle_size = 5;
ArrayList<int> _useful_pixels;
float _t = 0;
int _state = 0;
boolean mouse_outside_frame = false;

int test = 0;

var isMobile = false; //initiate as false

if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
        || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) isMobile = true;
 
function orientation(event){
  console.log("Magnetometer: "
    + event.alpha + ", "
    + event.beta + ", "
    + event.gamma
  );
}

if(window.DeviceOrientationEvent){
    // Firefox entra aqui
  window.addEventListener("deviceorientation", orientation, false);
}else{
  console.log("DeviceOrientationEvent is not supported");
}


function motion(event){
  console.log("Accelerometer: "
    + event.accelerationIncludingGravity.x + ", "
    + event.accelerationIncludingGravity.y + ", "
    + event.accelerationIncludingGravity.z
  );
}

if(window.DeviceMotionEvent){
  window.addEventListener("devicemotion", motion, false);
}else{
  console.log("DeviceMotionEvent is not supported");
}

if (window.DeviceMotionEvent != undefined) {
      
    window.ondevicemotion = function(e) {
        _particle_size=20;
        test = 1;
    }
}

void setup() {

    var width = window.innerWidth
    || document.documentElement.clientWidth
    || document.body.clientWidth;
    width = width - 100;

    size(width,450);
    background(255);
    frameRate(30);

    // device detection


    // Bezier Animation
    _number_of_particles = number_of_particles;
    _input = loadImage(image_path);
    _result = loadImage(image_path); //todo reuse input
    _input.loadPixels();

    _dimx = _input.width;
    _dimy = _input.height;
    _useful_pixels = new ArrayList<int>();
    _result.loadPixels();
    for (int i=0; i<_dimx*_dimy; ++i) {
        _result.pixels[i] = (_input.pixels[i] & 0x00FFFFFF);
    }
    _result.updatePixels();
    _input.updatePixels();
    partition_image();
    map_pixels_to_particles();
}

void draw() {
    background(255,0);
    translate((width-_dimx)/2,0);

    mouse_outside_frame = !mouse_in_frame();
    for(int i=0; i<_number_of_particles; ++i) {
        _particles[i].draw();
    }

    _result.updatePixels();
    if (frameCount==1) _result.copy();
    image(_result,0,0);

    translate(-(width-_dimx)/2, 0);
    println(test);
}

// Partition the image into parts represented by particles
void partition_image() {
    _particles = new Particle[_number_of_particles];
    _endpoints = new Particle[_number_of_particles];
    // Ignore white pixels
    for (int i=0; i<_dimx*_dimy; ++i) {
        if (_input.pixels[i] != -1) {
            _useful_pixels.add(i);
        }
    }

    // Of the useful pixels, select _number_of_particles at random to act as endpoints
    int particles_to_go = _number_of_particles;
    for (int i=0; particles_to_go > 0; ++i) {
        float chance = (float) particles_to_go / max((_useful_pixels.size()-i), 1);
        if ( random(1) < chance ) {
            PVector endpoint = coords_from_index(_useful_pixels.get(i));
            color particle_color = _input.pixels[_useful_pixels.get(i)];
            _particles[_number_of_particles - particles_to_go] = 
                    new Particle(endpoint, particle_color, _particle_size, _result);
            _endpoints[_number_of_particles - particles_to_go] = endpoint;
            particles_to_go--;
        }
    }
}

// Premaps pixels to their closest particle.
void map_pixels_to_particles() {
    // @todo - done by brute force at the moment. Improve this.
    for (int i = 0; i<_useful_pixels.size(); ++i) {
        float min_dist = 99999999;
        float curr_dist;
        int closest_index = 0;
        for (int j = 0; j<_number_of_particles; j++) {
            curr_dist = 
            (_endpoints[j].x-_useful_pixels.get(i) % _dimx) * (_endpoints[j].x-_useful_pixels.get(i) % _dimx) +
            (_endpoints[j].y-_useful_pixels.get(i) / _dimx) * (_endpoints[j].y-_useful_pixels.get(i) / _dimx);

            if (curr_dist < min_dist) {
                min_dist = curr_dist;
                closest_index = j;
            }
        }
        _particles[closest_index].add_dependent_pixel(_useful_pixels.get(i));
    }
}

PVector coords_from_index(int index) {
    return new PVector(index % _dimx, index / _dimx);
}

boolean mouse_in_frame(){
    int margin = 15;
    return (  mouseX < width-margin
            && mouseX > margin
            && mouseY > margin
            && mouseY < height-margin );
}

class Particle{
    private PImage _result;
    public ArrayList<int> _dependent_pixels;
    private color _color;
    private float _nominal_size;
    private float _speed;
    private boolean _completed_first;
    private boolean _active = true;
    private float _reference_state; //between 0 and 1.03
    private float _state;
    private int _alpha;
    private PVector _v0, _v1, _v2, _v3;

    Particle(PVector end, color c, float size, PImage result) {
        _result = result;
        _dependent_pixels = new ArrayList<int>();
        _nominal_size = size;
        _color = c;

        PVector start = new PVector(width/2, height/2);
        PVector random_dir = PVector.random2D();
        float distance = max(height, width)*(1+random(0.5));
        random_dir.mult(distance);
        start.add(random_dir);
        PVector dir_1 = new PVector(2*random(width)-width, 2*random(height)-height);
        PVector dir_2 = new PVector(2*random(width)-width, 2*random(height)-height);
        _v0 = start;
        _v1 = dir_1;
        _v2 = dir_2;
        _v3 = end;
        _speed = 2 + random(1);
    }

    void draw() {
        float t = compute_state();
        update_dependent_pixels();
        if (_active){
            PVector current_point = get_position_at( t );
            float   current_size  = _nominal_size * (1 + 5*(1 - t));

            stroke(_color);
            strokeWeight(current_size);
            point(current_point.x, current_point.y);
        }
    }

    float compute_state() {
        float attractive_force = (_speed - _state)/200;
        float repulsive_force = mouse_force();
        if (!_completed_first) repulsive_force = 0;

        float force = attractive_force - repulsive_force;
        _state = constrain(_state + force, 0, 1.03);

        if (_state ==1.03) {
            _active = false;
        }
        else {
            _active = true;
        }
        
        if (_state > 1) {
            _alpha = floor(constrain(2550*(1.03 - _state), 1, 255));
        }
        else _alpha = 255;
        _color = set_alpha(_alpha, _color);

        if (_state > 1) _completed_first = true;
        return min(1, _state);
    }

    void update_dependent_pixels() {
        for (int i=0; i<_dependent_pixels.size(); ++i) {
            if (_state < 1) {
                _result.pixels[_dependent_pixels.get(i)] = set_alpha(0, _result.pixels[_dependent_pixels.get(i)]);
            }
            else{
                _result.pixels[_dependent_pixels.get(i)] = set_alpha(256-_alpha, _result.pixels[_dependent_pixels.get(i)]);
            } 
        }
    }

    void set_reference_state(float ref) {
        _reference_state = ref;
    }

    color set_alpha(int alpha, color ref) {
        ref = ref & 0x00FFFFFF;
        ref = ref | alpha<<24;
        return ref;
    }

    void set_state(float t) {
        _state = t;
    }

    void add_dependent_pixel(int index){
        _dependent_pixels.add(index);
    }

    float mouse_force() {
        if (mouse_outside_frame) return 0;
        PVector mouse = new PVector(mouseX-(width-_dimx)/2, mouseY);
        float dist = mouse.dist(get_position()) + 20;

        if (!mousePressed) return 1.0 / dist;
        return 5.0/dist;
    }

    PVector get_end_position(){
        return _v3;
    }

    PVector get_position(){
        return get_position_at(min(1, _state));
    }

    PVector get_position_at(float t) {
        PVector pos = new PVector();
        pos.x = bezierPoint(_v0.x, _v1.x, _v2.x, _v3.x, t);
        pos.y = bezierPoint(_v0.y, _v1.y, _v2.y, _v3.y, t);
        return pos;
    }

    
};