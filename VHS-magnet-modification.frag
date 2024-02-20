
/*---- Most code is by modusmogulus -- Feel free to use :3
except pseudogaussian blur is based on CeeJayDK https://www.shadertoy.com/view/Mtl3Rj (thank you <3)
----*/

vec3 sharpen(in sampler2D video, in vec2 uv, in float strength) {
    vec3 vid = vec3(texture(video, uv));
    vid += vec3(texture(video, uv + strength));
    vid -= vec3(texture(video, uv - strength));
    vid += vec3(texture(video, vec2(uv.x + strength, uv.y)));
    vid -= vec3(texture(video, vec2(uv.x, uv.y + strength)));
        
    return vid;
}

//---------------------------- BLUR -----------------------------------
float SCurve (float x) {

		x = x * 2.0 - 1.0;
		return -x * abs(x) * 0.5 + x + 0.5;

}

vec4 BlurH (sampler2D source, vec2 size, vec2 uv, float radius) {

	if (radius >= 1.0)
	{
		vec4 A = vec4(0.0); 
		vec4 C = vec4(0.0); 

		float width = 1.0 / size.x;

		float divisor = 0.0; 
        float weight = 0.0;
        
        float radiusMultiplier = 1.0 / radius;
        
 		for (float x = -radius; x <= radius; x++)
		{
			A = texture(source, uv + vec2(x * width, 0.0));
            
            	weight = SCurve(1.0 - (abs(x) * radiusMultiplier)); 
            
            	C += A * weight; 
            
			divisor += weight; 
		}

		return vec4(C.r / divisor, C.g / divisor, C.b / divisor, 1.0);
	}

	return texture(source, uv);
}
//---------------------------- * -----------------------------------
vec3 rgb2hsv(vec3 c)
{
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// All components are in the range [0…1], including hue.
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 stripeArtifact(in sampler2D video, in vec2 uv,  in int stripes)
{
    //By modusmogulus
    vec3 vid = vec3(sharpen(iChannel0, uv, 0.000));
    for (int i = 0; i < stripes; i++) { 
        
        float cycletime = mod(floor( abs( iTime + ((uv.x+0.0)/1.1) ) * 10.0 ), 10.0 )  / 10.0;
        
        uv = vec2(clamp(uv.x + float(i)/iResolution.x + cycletime * uv.x  * 0.1 , 0.0, 1.0), uv.y);
        vec2 uv_edge = vec2(clamp(uv.x + float(i)/iResolution.x + cycletime * uv.x * 0.1 - 0.001 , 0.0, 1.0), uv.y);
        //vec3 value = clamp(vec3(texture(iChannel0, uv)), 0.8, 1.0) - 0.8;
        vec3 value = vec3(texture(iChannel0, uv));
        value = vec3(texture(iChannel0, uv)) - vec3(texture(iChannel0, uv_edge)) * 200.0;
        value = rgb2hsv(value);
        value = vec3(value.x, 0.0, value.z * 20.0);
        //value.z = sin(value.z * 0.2) * 2.0;
        //value.z = clamp(vid.x, 0.9, 1.0) * 100.0 - (0.9*100.0);
        value.z = exp(clamp(value.z * -1.0 + 1.0, 0.95, 1.0) * 40.0 - (0.95*40.0));
        value.z = value.z * sin(iTime / 10.0);
        value = hsv2rgb(value);
        
        if (i % 2 == 0) {
            vid += (value / float(stripes));
        }
        
        else {
            vid -= (value / float(stripes));
        }
    }
    
    return clamp(vid, 0.0, 1.0);
}


//Color Dodge
vec3 colorDodge (vec3 target, vec3 blend){
    vec3 temp;
    temp.x = (blend.x > 0.5) ? (1.0-(1.0-target.x)*(1.0-2.0*(blend.x-0.5))) : (target.x * (2.0*blend.x));
    temp.y = (blend.y > 0.5) ? (1.0-(1.0-target.y)*(1.0-2.0*(blend.y-0.5))) : (target.y * (2.0*blend.y));
    temp.z = (blend.z > 0.5) ? (1.0-(1.0-target.z)*(1.0-2.0*(blend.z-0.5))) : (target.z * (2.0*blend.z));
    return target + blend -0.5;
}





void mainImage( out vec4 fragColor, in vec2 fragCoord )
{

    float sharpenamount = 0.0009;
    vec2 uv = fragCoord/iResolution.xy;

    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    vec3 video = vec3(texture(iChannel0 ,uv));
    video = sharpen(iChannel0, uv, sharpenamount);
    vec4 background = vec4(stripeArtifact(iChannel0, uv, 100), 1.0);
    vec4 foreground = vec4(vec3(video.x, video.y, video.z), 1.0);
    vec4 stripedVideo = mix(background, foreground, clamp(foreground.y, 0.6, 0.7) * 2.5);
    stripedVideo = vec4(colorDodge(stripedVideo.xyz, foreground.xyz), 1.0);
    
    vec4 blurredVideo = BlurH(iChannel0, iResolution.xy, uv, 70.9);
    vec3 colChanHSV = rgb2hsv(blurredVideo.xyz);
    colChanHSV = vec3(colChanHSV.x - 0.0, colChanHSV.y*1.2, colChanHSV.z);
    colChanHSV.y += sin(iTime + uv.y * 10.1) * cos(uv.x + iTime) * 0.1;
    colChanHSV.y += sin(uv.y * 700.0) * cos(uv.x + iTime) * 0.1;
    vec3 valChanHSV = rgb2hsv(stripedVideo.xyz);
    vec3 combinedHSV = vec3(colChanHSV.x, colChanHSV.y, valChanHSV.z);
    vec3 combinedRGB = hsv2rgb(combinedHSV);

    fragColor = vec4(combinedRGB, 1.0);
    //fragColor = vec4(video, 1.0);
}
