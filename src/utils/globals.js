export const convertToRoleData = (value, returnType) => {
    if (!value) {
        return null;
    }
    let roleData;
    if (typeof value == "number") {
        switch (value) {
            case 1:
                roleData = "admin";
                break;
            case 0:
                roleData = "user";
                break;
            default:
                break;
        }
    }
    else if (typeof value == "string") {
        switch (value) {
            case "admin":
                roleData = 1;
                if (returnType && returnType === "string") {
                    roleData = "admin";
                }
                break;
            case "user":
                roleData = 0;
                if (returnType && returnType === "string") {
                    roleData = "user";
                }
                break;
            default:
                break;
        }
    }
    return roleData;
};
