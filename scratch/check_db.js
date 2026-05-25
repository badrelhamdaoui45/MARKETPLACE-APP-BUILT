import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

console.log("Script starting...");

// Manually parse .env file
const envContent = readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
    console.log("Querying albums...");
    const { data: albums, error } = await supabase
        .from('albums')
        .select('*');

    if (error) {
        console.error("Error fetching albums:", error);
        return;
    }

    console.log(`Fetched ${albums?.length || 0} albums.`);
    for (const album of albums) {
        console.log(`- Album: ${album.title} (ID: ${album.id})`);
        
        const { data: faceClusters, error: faceError } = await supabase
            .from('face_clusters')
            .select(`
                *,
                photo_faces (
                    id,
                    photo_id,
                    bounding_box
                )
            `)
            .eq('album_id', album.id);

        if (faceError) {
            console.error("Error fetching face clusters:", faceError);
            continue;
        }

        console.log(`  Face clusters count: ${faceClusters?.length || 0}`);
        for (const cluster of faceClusters) {
            console.log(`    Cluster: ${cluster.label} (ID: ${cluster.id})`);
            for (const face of cluster.photo_faces || []) {
                console.log(`      Face ID: ${face.id}, Photo ID: ${photo_id_to_name(face.photo_id)}, Box:`, face.bounding_box);
            }
        }
    }
}

function photo_id_to_name(photoId) {
    return photoId;
}

main().catch(console.error);
