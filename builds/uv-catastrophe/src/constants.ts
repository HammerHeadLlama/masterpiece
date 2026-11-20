// Exact 2019 SI values.
export const H = 6.62607015e-34; // Planck constant, J s
export const K_B = 1.380649e-23; // Boltzmann constant, J/K
export const C = 299792458; // speed of light, m/s

// Cavity: perfectly conducting cube.
export const L = 10e-6; // side, m
export const V = L ** 3; // volume, m^3
export const R_MAX = 160; // largest |n| in the mode table

// Frequency per unit |n|: f_n = F0 * |n|.
export const F0 = C / (2 * L);

// Radiation constant a = 8 pi^5 k^4 / (15 h^3 c^3), computed, not typed in.
export const A_RAD = (8 * Math.PI ** 5 * K_B ** 4) / (15 * H ** 3 * C ** 3);
