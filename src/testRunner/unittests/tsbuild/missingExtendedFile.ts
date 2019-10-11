namespace ts {
    describe("unittests:: tsbuild:: when tsconfig extends the missing file", () => {
        it("unittests:: tsbuild - when tsconfig extends the missing file", () => {
            const projFs = loadProjectFromDisk("tests/projects/missingExtendedConfig");
            const fs = projFs.shadow();
            const host = fakes.SolutionBuilderHost.create(fs);
            const builder = createSolutionBuilder(host, ["/src/tsconfig.json"], {});
            builder.build();
            host.assertDiagnosticMessages(
                errorDiagnostic([Diagnostics.The_specified_path_does_not_exist_Colon_0, "/src/foobar.json"]),
                errorDiagnostic([Diagnostics.No_inputs_were_found_in_config_file_0_Specified_include_paths_were_1_and_exclude_paths_were_2, "/src/tsconfig.first.json", "[\"**/*\"]", "[]"]),
                errorDiagnostic([Diagnostics.The_specified_path_does_not_exist_Colon_0, "/src/foobar.json"]),
                errorDiagnostic([Diagnostics.No_inputs_were_found_in_config_file_0_Specified_include_paths_were_1_and_exclude_paths_were_2, "/src/tsconfig.second.json", "[\"**/*\"]", "[]"])
            );
        });
    });
}
