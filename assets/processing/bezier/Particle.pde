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