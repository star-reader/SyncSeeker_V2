const radiansToDegrees = (radians: number) => {
    const degrees = radians % (2 * Math.PI);
    return (degrees * 180) / Math.PI;
}

const calcHeading = (_lat1: number, _lng1: number, _lat2: number, _lng2: number) => {
    let rad = Math.PI / 180,
        lat1 = _lat1 * rad,
        lat2 = _lat2 * rad,
        lon1 = _lng1 * rad,
        lon2 = _lng2 * rad;
    const a = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const b = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    return Math.atan2(a, b) > 0 ? Math.atan2(a, b) : Math.atan2(a, b) + Math.PI*2
    //return radiansToDegrees(Math.atan2(a, b));
}

const calcDistance = (dep_lat: number, dep_lng: number, co_lat: number, co_lng: number) => {
    let s1
    let radLat1 = dep_lat * Math.PI / 180.0;
    let radLat2 = co_lat * Math.PI / 180.0;
    let a = radLat1 - radLat2;
    let b = dep_lng * Math.PI / 180.0 - co_lng * Math.PI / 180.0;
    s1 = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
    s1 = s1 * 6378.137;
    return Math.round(s1 * 10000) / 10
}

export { radiansToDegrees, calcHeading , calcDistance }