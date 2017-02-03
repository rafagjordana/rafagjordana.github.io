/** Bezier_Image.pde
 * 
 *  @author: Rafael Gomez-Jordana
 *
 *  Divides the image into blobs which follow bezier curves.
 */

/**** Configuration ********************************/
/**/ final int number_of_particles = 1000;
/**/ final String image_path = "images/rafa.png";


void setup() {
    size(400,400);
    background(255);
    frameRate(30);
}

void draw() {
    background(100);
}
