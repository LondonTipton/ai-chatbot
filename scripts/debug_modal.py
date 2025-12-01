import modal
import sys

# Connect to the running app
app = modal.App("legal-search-api")

def main():
    print("Invoking generate_sparse_embedding_internal remotely...")
    
    # Import the function from the deployed app
    # Note: We need to import the function definition. 
    # Since we can't easily import from the file without it being a module,
    # we'll use Function.lookup
    
    try:
        f = modal.Function.from_name("legal-search-api", "generate_sparse_embedding_internal")
        result = f.remote("test query")
        print("Success!")
        print(result)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
