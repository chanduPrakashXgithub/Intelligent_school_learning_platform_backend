import { BaseRepository } from
    "../../core/database/base.repository.js";

class ClassRepository extends BaseRepository {

    constructor() {
        super("classes");
    }

}

export const classRepository = new ClassRepository();