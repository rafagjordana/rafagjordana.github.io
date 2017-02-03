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