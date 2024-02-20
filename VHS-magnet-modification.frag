
float SCurve (float x) {
	
    
    // ---- by CeeJayDK https://www.shadertoy.com/view/Mtl3Rj

		x = x * 2.0 - 1.0;
		return -x * abs(x) * 0.5 + x + 0.5;
		
        
    //return dot(vec3(-x, 2.0, 1.0 ),vec3(abs(x), x, 1.0)) * 0.5; // possibly faster version
	
  
    
    // ---- original for posterity
    
    // How to do this without if-then-else?
    // +edited the too steep curve value
    
    // if (value < 0.5)
    // {
    //    return value * value * 2.0;
    // }
    
    // else
    // {
    // 	value -= 1.0;
    
    // 	return 1.0 - value * value * 2.0;
    // }
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


vec3 sharpen(in sampler2D video, in vec2 uv, in float strength) {
    vec3 vid = vec3(texture(video, uv));
    vid += vec3(texture(video, uv + strength));
    vid -= vec3(texture(video, uv - strength));
         
    return vid;
}

vec3 stripeArtifact(in sampler2D video, in vec2 uv,  in int stripes)
{
    //By modusmogulus
    vec3 vid = vec3(texture(iChannel0 ,uv));

    for (int i = 0; i < stripes; i++) { 
        
        float cycletime = mod(floor( abs( iTime + ((uv.x+0.0)/1.1) ) * 10.0 ), 10.0 )  / 10.0;
        
        uv = vec2(clamp(uv.x + float(i)/iResolution.x + cycletime * uv.x * 0.02 , 0.0, 1.0), uv.y);
        vec3 contrasty = clamp(vec3(texture(iChannel0, uv)), 0.8, 1.0) - 0.8;
        contrasty = vec3(contrasty.x, contrasty.x, contrasty.x);
        contrasty *= float(stripes * 2);
        
        if (i % 2 == 0) {
            vid -= contrasty / float(stripes);
        }
        
        else {
            vid += contrasty / float(stripes);
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



void mainImage( out vec4 fragColor, in vec2 fragCoord )
{

    vec2 uv = fragCoord/iResolution.xy;

    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
    vec3 video = vec3(texture(iChannel0 ,uv));
    video = sharpen(iChannel0, uv, 0.0015);
    vec4 background = vec4(stripeArtifact(iChannel0, uv, 100), 1.0);
    vec4 foreground = vec4(vec3(video.x, video.y, video.z), 1.0);
    vec4 stripedVideo = mix(background, foreground, clamp(foreground.y, 0.6, 0.7) * 2.5);
    stripedVideo = vec4(colorDodge(stripedVideo.xyz, foreground.xyz), 1.0);
    
    vec4 blurredVideo = BlurH(iChannel0, iResolution.xy, uv, 53.9);
    vec3 colChanHSV = rgb2hsv(blurredVideo.xyz);
    colChanHSV = vec3(colChanHSV.x, colChanHSV.y*2.0, colChanHSV.z);
    vec3 valChanHSV = rgb2hsv(stripedVideo.xyz);
    vec3 combinedHSV = vec3(colChanHSV.x, colChanHSV.y, valChanHSV.z);
    vec3 combinedRGB = hsv2rgb(combinedHSV);
    fragColor = vec4(combinedRGB, 1.0);
}