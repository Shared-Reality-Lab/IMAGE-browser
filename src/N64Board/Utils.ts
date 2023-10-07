export function isInSegment(normallizedLoc: {x: number, y: number}, segment: any): boolean {
    const x = normallizedLoc.x;
    const y = normallizedLoc.y;
    let inside = false;

    segment.contours[0].forEach((contour: { coordinates: any[]; }) => {
        for (let i = 0, j = contour.coordinates.length - 1; i < contour.coordinates.length; j = i++) {
            const xi = contour.coordinates[i][0];
            const yi = contour.coordinates[i][1];
            const xj = contour.coordinates[j][0];
            const yj = contour.coordinates[j][1];

            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) {
                inside = !inside;
            }
        }
    });
    return inside;
}

export function mapValue(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
    // Ensure the input value is within the specified range
    value = Math.min(Math.max(value, inMin), inMax);
    // Calculate the mapped value
    const mappedValue = ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
    return mappedValue;
}