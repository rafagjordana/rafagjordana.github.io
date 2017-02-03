/* @pjs preload="images/rafa.png"; */

/**** Configuration ********************************/
/**/ final int number_of_particles = 1000;
/**/ final String image_path = "images/rafa.png";


BezierAnimation animation;
PImage test;
void setup() {
    size(400,400);
    background(255);
    frameRate(30);
    animation = new BezierAnimation(number_of_particles, image_path);
    
    // test = loadImage(image_path);
}

void draw() {
    // background(255);
    // animation.draw();
    // image(test, 0, 0);
}

class BezierAnimation {
    // Member variables
    private int _number_of_particles;
    private PImage _input, _thresholded, _result;
    private Particle _particles[];
    private int _dimx, _dimy;
    private int _particle_size = 5;
    private ArrayList<int> _useful_pixels;
    private float _t = 0;
    private int _state = 0;

    // Load and initialize stuff
    BezierAnimation(int np, String image_path) {
        
        _number_of_particles = np;
        _input = loadImage(image_path);
        _thresholded = loadImage(image_path)
        _result = loadImage(image_path); //todo reuse input
        _input.loadPixels();

        _dimx = _input.width;
        _dimy = _input.height;
        _useful_pixels = new ArrayList<int>();
        _result.loadPixels();
        for (int i=0; i<_dimx*_dimy; ++i) {
            float red = red(_input.pixels[i]);
            float blue = blue(_input.pixels[i]);
            float green = green(_input.pixels[i]);
            color c = color(red, green, blue, 1);
            _result.pixels[i] = c;
        }
        _result.updatePixels();
        _input.updatePixels();
        image(_input, 0, 0);
        // partition_image();
        // map_pixels_to_particles();
    }

    void draw() {
        for(int i=0; i<_number_of_particles; ++i) {
            _particles[i].draw();
        }
        _result.updatePixels();
        image(_result,0,0);
    }

    // Partition the image into parts represented by particles
    private void partition_image() {
        _particles = new Particle[_number_of_particles];

        // Ignore white pixels
        _thresholded.filter(THRESHOLD, 0.98);
        // _thresholded.loadPixels();
        
        // for (int i=0; i<_dimx*_dimy; ++i) {
        //     if (brightness(_thresholded.pixels[i]) == 0) {
        //         _useful_pixels.append(i);
        //     }
        // }

        // // Of the useful pixels, select _number_of_particles at random to act as endpoints
        // int particles_to_go = _number_of_particles;
        // for (int i=0; particles_to_go > 0; ++i) {
        //     float chance = (float) particles_to_go / max((_useful_pixels.size()-i), 1);
        //     if ( random(1) < chance ) {
        //         PVector endpoint = coords_from_index(_useful_pixels.get(i));
        //         color particle_color = _input.pixels[_useful_pixels.get(i)];
        //         _particles[_number_of_particles - particles_to_go] = 
        //                 new Particle(endpoint, particle_color, _particle_size, _result);
        //         particles_to_go--;
        //     }
        // }
    }

    // Premaps pixels to their closest particle.
    private void map_pixels_to_particles() {
        // @todo - done by brute force at the moment. Improve this.
        for (int i = 0; i<_useful_pixels.size(); ++i) {
            float min_dist = 100000;
            float curr_dist;
            int closest_index = 0;
            for (int j = 0; j<_number_of_particles; j++) {
                curr_dist = coords_from_index(_useful_pixels.get(i)).dist(
                        _particles[j].get_end_position());
                if (curr_dist < min_dist) {
                    min_dist = curr_dist;
                    closest_index = j;
                }
            }
            _particles[closest_index].add_dependent_pixel(_useful_pixels.get(i));
        }
    }

    private PVector coords_from_index(int index) {
        return new PVector(index % _dimx, index / _dimx);
    }
};

class Particle{
    private PImage _result;
    private BezierTrajectory _trajectory;
    private IntList _dependent_pixels;
    private color _color;
    private float _nominal_size;
    private float _speed;
    private boolean _completed_first;

    private float _reference_state; //between 0 and 1.03
    private float _state;
    private int _alpha;

    Particle(PVector end, color c, float size, PImage result) {
        _result = result;
        _dependent_pixels = new IntList();
        _nominal_size = size;
        _color = c;

        PVector start = new PVector(width/2, height/2).add(PVector.random2D().mult(min(height, width)*(1+random(0.5))));
        PVector dir_1 = new PVector(2*random(width)-width, 2*random(height)-height);
        PVector dir_2 = new PVector(2*random(width)-width, 2*random(height)-height);
        _trajectory = new BezierTrajectory(start, dir_1, dir_2, end);

        _speed = 2 + random(1);
    }

    void draw() {
        float t = compute_state();
        PVector current_point = _trajectory.get_position( t );
        float   current_size  = _nominal_size * (1 + 5*(1 - t));

        stroke(_color);
        strokeWeight(current_size);
        point(current_point.x, current_point.y);
        
        update_dependent_pixels();
    }

    float compute_state() {
        float attractive_force = (_speed - _state)/200;
        float repulsive_force = mouse_force();
        if (!_completed_first) repulsive_force = 0;

        float force = attractive_force - repulsive_force;
        _state = constrain(_state + force, 0, 1.03);

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
        ref = ref & ~(255<<24);
        ref = ref | alpha<<24;
        return ref;
    }

    void set_state(float t) {
        _state = t;
    }

    void add_dependent_pixel(int index){
        _dependent_pixels.append(index);
    }

    float mouse_force() {
        PVector mouse = new PVector(mouseX, mouseY);
        float dist = mouse.dist(get_position()) + 1;

        // if (dist > 200)
        //     return 0;
        int multiplier = 1;
        if (mousePressed == true) multiplier = 5;
        return 40*multiplier/sq(dist);
    }

    PVector get_end_position(){
        return _trajectory.get_position(1);
    }

    PVector get_position(){
        return _trajectory.get_position(min(1, _state));
    }
};

class BezierTrajectory {

    private PVector _v0, _v1, _v2, _v3;

    BezierTrajectory(PVector start, PVector dir1, PVector dir2, PVector end) {
        _v0 = start;
        _v1 = dir1;
        _v2 = dir2;
        _v3 = end;
    }

    public PVector get_position(float t) {
        PVector pos = new PVector();
        pos.x = bezierPoint(_v0.x, _v1.x, _v2.x, _v3.x, t);
        pos.y = bezierPoint(_v0.y, _v1.y, _v2.y, _v3.y, t);
        return pos;
    }
};