namespace ts {
    describe("unittests:: tsbuild:: with resolveJsonModule option on project resolveJsonModuleAndComposite", () => {
        let projFs: vfs.FileSystem;
        const allExpectedOutputs = ["/src/dist/src/index.js", "/src/dist/src/index.d.ts", "/src/dist/src/hello.json"];
        before(() => {
            projFs = loadProjectFromDisk("tests/projects/resolveJsonModuleAndComposite");
        });

        after(() => {
            projFs = undefined!; // Release the contents
        });

        function verifyProjectWithResolveJsonModule(configFile: string, ...expectedDiagnosticMessages: fakes.ExpectedDiagnostic[]) {
            const fs = projFs.shadow();
            verifyProjectWithResolveJsonModuleWithFs(fs, configFile, allExpectedOutputs, ...expectedDiagnosticMessages);
        }

        function verifyProjectWithResolveJsonModuleWithFs(fs: vfs.FileSystem, configFile: string, allExpectedOutputs: readonly string[], ...expectedDiagnosticMessages: fakes.ExpectedDiagnostic[]) {
            const host = fakes.SolutionBuilderHost.create(fs);
            const builder = createSolutionBuilder(host, [configFile], { dry: false, force: false, verbose: false });
            builder.build();
            host.assertDiagnosticMessages(...expectedDiagnosticMessages);
            if (!expectedDiagnosticMessages.length) {
                // Check for outputs. Not an exhaustive list
                verifyOutputsPresent(fs, allExpectedOutputs);
            }
        }

        it("with resolveJsonModule and include only", () => {
            verifyProjectWithResolveJsonModule(
                "/src/tsconfig_withInclude.json",
                {
                    message: [
                        Diagnostics.File_0_is_not_listed_within_the_file_list_of_project_1_Projects_must_list_all_files_or_use_an_include_pattern,
                        "/src/src/hello.json",
                        "/src/tsconfig_withInclude.json"
                    ],
                    location: expectedLocationIndexOf(projFs, "/src/src/index.ts", `"./hello.json"`)
                }
            );
        });

        it("with resolveJsonModule and include of *.json along with other include", () => {
            verifyProjectWithResolveJsonModule("/src/tsconfig_withIncludeOfJson.json");
        });

        it("with resolveJsonModule and include of *.json along with other include and file name matches ts file", () => {
            const fs = projFs.shadow();
            fs.rimrafSync("/src/src/hello.json");
            fs.writeFileSync("/src/src/index.json", JSON.stringify({ hello: "world" }));
            fs.writeFileSync("/src/src/index.ts", `import hello from "./index.json"

export default hello.hello`);
            const allExpectedOutputs = ["/src/dist/src/index.js", "/src/dist/src/index.d.ts", "/src/dist/src/index.json"];
            verifyProjectWithResolveJsonModuleWithFs(
                fs,
                "/src/tsconfig_withIncludeOfJson.json",
                allExpectedOutputs,
                errorDiagnostic([Diagnostics.Cannot_write_file_0_because_it_would_be_overwritten_by_multiple_input_files, "/src/dist/src/index.d.ts"])
            );
        });

        it("with resolveJsonModule and files containing json file", () => {
            verifyProjectWithResolveJsonModule("/src/tsconfig_withFiles.json");
        });

        it("with resolveJsonModule and include and files", () => {
            verifyProjectWithResolveJsonModule("/src/tsconfig_withIncludeAndFiles.json");
        });

        it("with resolveJsonModule and sourceMap", () => {
            const { fs, tick } = getFsWithTime(projFs);
            const configFile = "src/tsconfig_withFiles.json";
            replaceText(fs, configFile, `"composite": true,`, `"composite": true, "sourceMap": true,`);
            const host = fakes.SolutionBuilderHost.create(fs);
            let builder = createSolutionBuilder(host, [configFile], { verbose: true });
            builder.build();
            host.assertDiagnosticMessages(
                getExpectedDiagnosticForProjectsInBuild(configFile),
                [Diagnostics.Project_0_is_out_of_date_because_output_file_1_does_not_exist, configFile, "src/dist/src/index.js"],
                [Diagnostics.Building_project_0, `/${configFile}`]
            );
            verifyOutputsPresent(fs, [...allExpectedOutputs, "/src/dist/src/index.js.map"]);
            host.clearDiagnostics();
            builder = createSolutionBuilder(host, [configFile], { verbose: true });
            tick();
            builder.build();
            host.assertDiagnosticMessages(
                getExpectedDiagnosticForProjectsInBuild(configFile),
                [Diagnostics.Project_0_is_up_to_date_because_newest_input_1_is_older_than_oldest_output_2, configFile, "src/src/index.ts", "src/dist/src/index.js"]
            );
        });

        it("with resolveJsonModule and without outDir", () => {
            const { fs, tick } = getFsWithTime(projFs);
            const configFile = "src/tsconfig_withFiles.json";
            replaceText(fs, configFile, `"outDir": "dist",`, "");
            const host = fakes.SolutionBuilderHost.create(fs);
            let builder = createSolutionBuilder(host, [configFile], { verbose: true });
            builder.build();
            host.assertDiagnosticMessages(
                getExpectedDiagnosticForProjectsInBuild(configFile),
                [Diagnostics.Project_0_is_out_of_date_because_output_file_1_does_not_exist, configFile, "src/src/index.js"],
                [Diagnostics.Building_project_0, `/${configFile}`]
            );
            verifyOutputsPresent(fs, ["/src/src/index.js", "/src/src/index.d.ts"]);
            host.clearDiagnostics();
            builder = createSolutionBuilder(host, [configFile], { verbose: true });
            tick();
            builder.build();
            host.assertDiagnosticMessages(
                getExpectedDiagnosticForProjectsInBuild(configFile),
                [Diagnostics.Project_0_is_up_to_date_because_newest_input_1_is_older_than_oldest_output_2, configFile, "src/src/index.ts", "src/src/index.js"]
            );
        });
    });

    describe("unittests:: tsbuild:: with resolveJsonModule option on project importJsonFromProjectReference", () => {
        let projFs: vfs.FileSystem;
        before(() => {
            projFs = loadProjectFromDisk("tests/projects/importJsonFromProjectReference");
        });

        after(() => {
            projFs = undefined!; // Release the contents
        });

        it("when importing json module from project reference", () => {
            const expectedOutput = "/src/main/index.js";
            const { fs, tick } = getFsWithTime(projFs);
            const configFile = "src/tsconfig.json";
            const stringsConfigFile = "src/strings/tsconfig.json";
            const mainConfigFile = "src/main/tsconfig.json";
            const host = fakes.SolutionBuilderHost.create(fs);
            let builder = createSolutionBuilder(host, [configFile], { verbose: true });
            builder.build();
            host.assertDiagnosticMessages(
                getExpectedDiagnosticForProjectsInBuild(stringsConfigFile, mainConfigFile, configFile),
                [Diagnostics.Project_0_is_out_of_date_because_output_file_1_does_not_exist, stringsConfigFile, "src/strings/tsconfig.tsbuildinfo"],
                [Diagnostics.Building_project_0, `/${stringsConfigFile}`],
                [Diagnostics.Project_0_is_out_of_date_because_output_file_1_does_not_exist, mainConfigFile, "src/main/index.js"],
                [Diagnostics.Building_project_0, `/${mainConfigFile}`],
            );
            verifyOutputsPresent(fs, [expectedOutput]);
            host.clearDiagnostics();
            builder = createSolutionBuilder(host, [configFile], { verbose: true });
            tick();
            builder.build();
            host.assertDiagnosticMessages(
                getExpectedDiagnosticForProjectsInBuild(stringsConfigFile, mainConfigFile, configFile),
                [Diagnostics.Project_0_is_up_to_date_because_newest_input_1_is_older_than_oldest_output_2, stringsConfigFile, "src/strings/foo.json", "src/strings/tsconfig.tsbuildinfo"],
                [Diagnostics.Project_0_is_up_to_date_because_newest_input_1_is_older_than_oldest_output_2, mainConfigFile, "src/main/index.ts", "src/main/index.js"],
            );
        });
    });
}
