fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if let Err(err) = journal_repo::run(args) {
        err.print_and_exit();
    }
}
